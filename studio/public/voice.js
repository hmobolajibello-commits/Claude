// Continuous speech recognition, wrapped so the rest of the app just gets events.
//
// The Web Speech API is quirky in ways worth knowing about:
//  - Chrome ends a session on its own every ~60s of quiet, so `continuous` is
//    not actually continuous; we restart on every `end` while still enabled.
//  - Results arrive as a growing list of interim chunks that get "finalised" in
//    place, so we track finals separately from the interim tail.
//  - Firefox has no support at all, hence the isSupported check.

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export const isSupported = !!SpeechRecognition;

export class VoiceListener extends EventTarget {
  constructor(options = {}) {
    super();
    this.options = { language: 'en-US', silenceMs: 1400, autoSend: true, wakeWord: '', requireWakeWord: false, ...options };
    this.enabled = false;
    this.recognition = null;
    this.finalText = '';
    this.silenceTimer = null;
    this.restartTimer = null;
    this.paused = false; // held true while speech synthesis is talking
  }

  configure(patch) {
    Object.assign(this.options, patch);
    if (this.recognition) this.recognition.lang = this.options.language;
  }

  start() {
    if (!isSupported || this.enabled) return;
    this.enabled = true;
    this.#emit('state', { listening: true });
    this.#spinUp();
  }

  stop() {
    this.enabled = false;
    clearTimeout(this.silenceTimer);
    clearTimeout(this.restartTimer);
    if (this.recognition) {
      this.recognition.onend = null;
      try { this.recognition.stop(); } catch { /* already stopped */ }
      this.recognition = null;
    }
    this.finalText = '';
    this.#emit('state', { listening: false });
  }

  toggle() {
    this.enabled ? this.stop() : this.start();
  }

  /** Suspend the mic while the app speaks, so it does not transcribe itself. */
  pause() {
    if (!this.enabled || this.paused) return;
    this.paused = true;
    if (this.recognition) {
      try { this.recognition.stop(); } catch { /* fine */ }
    }
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    if (this.enabled && !this.recognition) this.#spinUp();
  }

  #spinUp() {
    const recognition = new SpeechRecognition();
    recognition.lang = this.options.language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) this.finalText += (this.finalText ? ' ' : '') + text.trim();
        else interim += text;
      }
      const combined = `${this.finalText} ${interim}`.trim();
      if (combined) this.#emit('partial', { text: combined, final: this.finalText, interim: interim.trim() });
      this.#armSilence();
    };

    recognition.onerror = (event) => {
      // `no-speech` and `aborted` are routine in a long listening session.
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.enabled = false;
        this.#emit('error', { message: 'Microphone access was blocked. Allow it in your browser\'s site settings, then start listening again.', fatal: true });
        this.#emit('state', { listening: false });
        return;
      }
      if (event.error === 'network') {
        this.#emit('error', { message: 'Speech recognition lost its network connection. Chrome sends audio to Google to transcribe it, so this needs to be online.', fatal: false });
        return;
      }
      this.#emit('error', { message: `Speech recognition error: ${event.error}`, fatal: false });
    };

    recognition.onend = () => {
      this.recognition = null;
      if (!this.enabled || this.paused) return;
      // Browser-imposed timeout: flush anything pending, then restart.
      this.#flushIfIdle();
      this.restartTimer = setTimeout(() => {
        if (this.enabled && !this.paused && !this.recognition) this.#spinUp();
      }, 250);
    };

    try {
      recognition.start();
      this.recognition = recognition;
    } catch (err) {
      // start() throws if a previous instance has not fully released the mic.
      this.restartTimer = setTimeout(() => { if (this.enabled) this.#spinUp(); }, 400);
    }
  }

  #armSilence() {
    clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => this.#flush(), this.options.silenceMs);
  }

  #flushIfIdle() {
    if (this.finalText.trim()) this.#flush();
  }

  #flush() {
    clearTimeout(this.silenceTimer);
    const text = this.finalText.trim();
    this.finalText = '';
    if (!text) return;

    const gated = this.#applyWakeWord(text);
    if (gated === null) {
      this.#emit('ignored', { text });
      return;
    }
    this.#emit('utterance', { text: gated, autoSend: this.options.autoSend });
  }

  /**
   * With the wake word on, only speech that contains it counts, and everything
   * up to and including it is stripped. Returns null for speech to ignore.
   */
  #applyWakeWord(text) {
    const wake = (this.options.wakeWord || '').trim().toLowerCase();
    if (!this.options.requireWakeWord || !wake) return text;
    const index = text.toLowerCase().indexOf(wake);
    if (index === -1) return null;
    const rest = text.slice(index + wake.length).replace(/^[\s,.:;!?-]+/, '').trim();
    return rest || null;
  }

  #emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

/** Text to speech for replies, with markdown and code stripped out. */
export class Speaker {
  constructor() {
    this.enabled = false;
    this.synth = window.speechSynthesis || null;
  }

  get available() {
    return !!this.synth;
  }

  speak(text, { onStart, onEnd } = {}) {
    if (!this.enabled || !this.synth) return;
    const clean = Speaker.forSpeech(text);
    if (!clean) return;
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(clean.slice(0, 1200));
    utterance.rate = 1.05;
    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    this.synth.speak(utterance);
  }

  cancel() {
    this.synth?.cancel();
  }

  /** Reading a code block aloud helps nobody. */
  static forSpeech(markdown) {
    return markdown
      .replace(/```[\s\S]*?```/g, ' — code block — ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^[-*]\s+/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
