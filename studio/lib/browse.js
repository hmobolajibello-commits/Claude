// Free web access: search without an API key, and fetch pages as readable text.
//
// The model chooses these URLs, so every fetch is treated as attacker-influenced.
// guardUrl() blocks non-HTTP schemes and private address space, and we re-check
// after each redirect — a public URL that 302s to 169.254.169.254 is the classic
// way to read cloud credentials out from under a "browse the web" feature.

import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_BYTES = 3_000_000;
const MAX_TEXT = 40_000;
const TIMEOUT_MS = 20_000;
const UA = 'Mozilla/5.0 (compatible; VoiceStudio/1.0; +local-agent)';

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const low = ip.toLowerCase();
    if (low === '::1' || low === '::') return true;
    if (low.startsWith('fc') || low.startsWith('fd')) return true; // unique-local
    if (low.startsWith('fe80')) return true; // link-local
    if (low.startsWith('::ffff:')) return isPrivateIp(low.slice(7)); // v4-mapped
    return false;
  }
  return false;
}

export async function guardUrl(raw, { allowPrivate = false } = {}) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`not a valid URL: ${raw}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`only http and https URLs can be fetched, got ${url.protocol}`);
  }
  if (allowPrivate) return url;

  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (/^(localhost|.*\.localhost|.*\.internal|.*\.local)$/i.test(host)) {
    throw new Error(`refusing to fetch a private host: ${host}`);
  }
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error(`refusing to fetch a private address: ${host}`);
    return url;
  }
  let records;
  try {
    records = await dns.lookup(host, { all: true });
  } catch {
    throw new Error(`could not resolve ${host}`);
  }
  for (const record of records) {
    if (isPrivateIp(record.address)) {
      throw new Error(`${host} resolves to the private address ${record.address}; refusing to fetch it`);
    }
  }
  return url;
}

/** fetch() with redirects followed by hand so each hop is re-checked. */
async function safeFetch(raw, { allowPrivate = false, headers = {}, method = 'GET', body } = {}) {
  let current = raw;
  for (let hop = 0; hop < 5; hop++) {
    const url = await guardUrl(current, { allowPrivate });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(url, {
        method,
        body,
        headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8', ...headers },
        redirect: 'manual',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location'), url).toString();
      continue;
    }
    return { res, finalUrl: url.toString() };
  }
  throw new Error('too many redirects');
}

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", mdash: '—',
  ndash: '–', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
};

function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code) => {
    const key = code.toLowerCase();
    if (ENTITIES[key]) return ENTITIES[key];
    if (key.startsWith('#x')) return String.fromCodePoint(parseInt(key.slice(2), 16) || 32);
    if (key.startsWith('#')) return String.fromCodePoint(parseInt(key.slice(1), 10) || 32);
    return match;
  });
}

/** Strip a page down to the text a language model can actually use. */
export function htmlToText(html) {
  let text = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|canvas|iframe|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|section|article|tr|h[1-6]|blockquote|pre)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<h([1-6])[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ');
  text = decodeEntities(text)
    .replace(/[ \t]+([.,;:!?)])/g, '$1'); // tag removal leaves gaps before punctuation
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
    .filter((line, i, arr) => line !== '' || arr[i - 1] !== '')
    .join('\n')
    .trim();
}

export function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1]).replace(/\s+/g, ' ').trim().slice(0, 200) : '';
}

export function extractLinks(html, baseUrl, limit = 40) {
  const links = [];
  const seen = new Set();
  const re = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html)) && links.length < limit) {
    let href;
    try {
      href = new URL(match[1], baseUrl).toString();
    } catch {
      continue;
    }
    if (!href.startsWith('http') || seen.has(href)) continue;
    const label = decodeEntities(match[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (!label) continue;
    seen.add(href);
    links.push({ url: href, text: label.slice(0, 120) });
  }
  return links;
}

/** Fetch one page and return it as text plus its outbound links. */
export async function browseUrl(raw, { allowPrivate = false, includeLinks = true } = {}) {
  const { res, finalUrl } = await safeFetch(raw, { allowPrivate });
  const type = (res.headers.get('content-type') || '').toLowerCase();
  if (!res.ok && res.status !== 203) {
    const detail = type.includes('json') || type.includes('text')
      ? (await res.text().catch(() => '')).slice(0, 500)
      : '';
    throw new Error(`${finalUrl} returned HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error(`${finalUrl} is ${buffer.byteLength} bytes, too large to read`);
  }
  const raw_text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);

  if (type.includes('json')) {
    return { url: finalUrl, title: '', contentType: type, text: raw_text.slice(0, MAX_TEXT), links: [] };
  }
  if (!type.includes('html') && !type.includes('text') && !type.includes('xml')) {
    return { url: finalUrl, title: '', contentType: type, text: `[${type || 'binary'} content, ${buffer.byteLength} bytes — not text]`, links: [] };
  }

  const isHtml = type.includes('html') || /<html[\s>]/i.test(raw_text);
  const text = isHtml ? htmlToText(raw_text) : raw_text;
  const truncated = text.length > MAX_TEXT;
  return {
    url: finalUrl,
    title: isHtml ? extractTitle(raw_text) : '',
    contentType: type,
    text: truncated ? `${text.slice(0, MAX_TEXT)}\n\n[truncated at ${MAX_TEXT} characters]` : text,
    links: isHtml && includeLinks ? extractLinks(raw_text, finalUrl) : [],
  };
}

/** Pull the attributes out of one tag, so parsing does not depend on their order. */
function attrsOf(tag) {
  const attrs = {};
  const re = /([a-z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let match;
  while ((match = re.exec(tag))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

/**
 * Keyless web search via DuckDuckGo's HTML endpoints. No API key and no quota,
 * so search works the moment the app starts — the tradeoff is that we parse
 * HTML, which is the part most likely to need updating over time. Two endpoints
 * are tried, and anchors are matched on attributes rather than on attribute
 * order, so a markup reshuffle degrades rather than breaks.
 */
export async function webSearch(query, { limit = 8 } = {}) {
  if (!query || !query.trim()) throw new Error('a search query is required');

  const endpoints = [
    { url: 'https://lite.duckduckgo.com/lite/', method: 'POST' },
    { url: 'https://html.duckduckgo.com/html/', method: 'POST' },
  ];

  let lastError;
  for (const endpoint of endpoints) {
    let html;
    try {
      const { res } = await safeFetch(endpoint.url, {
        method: endpoint.method,
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: `q=${encodeURIComponent(query)}`,
      });
      html = await res.text();
    } catch (err) {
      lastError = err;
      continue;
    }

    const results = parseResults(html, endpoint.url, limit);
    if (results.length) return results;
  }

  if (lastError) throw new Error(`web search failed: ${lastError.message}`);
  return [];
}

function parseResults(html, baseUrl, limit) {
  const results = [];
  const seen = new Set();

  const anchorRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(html)) && results.length < limit) {
    const attrs = attrsOf(match[1]);
    const href = attrs.href;
    if (!href) continue;

    const isResult = /\bresult-link\b|\bresult__a\b/.test(attrs.class || '') || /[?&]uddg=/.test(href);
    if (!isResult) continue;

    const url = unwrapDuck(href, baseUrl);
    if (!url || seen.has(url)) continue;
    let hostname;
    try {
      hostname = new URL(url).hostname;
    } catch {
      continue;
    }
    if (/(^|\.)duckduckgo\.com$/.test(hostname)) continue;

    seen.add(url);
    const title = decodeEntities(match[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (!title) continue;
    results.push({ url, title, snippet: '' });
  }

  // Snippet cells come through in the same order as the links they belong to.
  const snippets = [];
  const snipRe = /<(td|a)[^>]*class=["'][^"']*result[-_]{1,2}snippet[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi;
  while ((match = snipRe.exec(html))) {
    snippets.push(decodeEntities(match[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim());
  }
  results.forEach((result, i) => { result.snippet = (snippets[i] || '').slice(0, 400); });

  return results;
}

/** DuckDuckGo wraps outbound links as /l/?uddg=<encoded>. */
function unwrapDuck(href, baseUrl = 'https://lite.duckduckgo.com') {
  try {
    const url = new URL(href, baseUrl);
    if (url.pathname.startsWith('/l/') && url.searchParams.get('uddg')) {
      return url.searchParams.get('uddg');
    }
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
