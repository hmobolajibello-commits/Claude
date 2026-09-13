// Sandboxed file access for the workspace the AI writes code into.
//
// Every path the model hands us is untrusted: it arrives as a string inside a
// tool call, so it may be absolute, may contain "..", or may point at a symlink
// that escapes the workspace. resolve() is the single choke point that turns a
// model-supplied path into a real path, and it refuses anything outside root.

import { promises as fs } from 'node:fs';
import path from 'node:path';

const MAX_READ = 400_000; // bytes; enough for any source file, small enough to not blow the context
const SKIP_DIRS = new Set(['.git', 'node_modules', '.studio', 'dist', 'build', '.next', '__pycache__']);

export class Workspace {
  constructor(root) {
    this.root = path.resolve(root);
  }

  async init() {
    await fs.mkdir(this.root, { recursive: true });
    // Canonicalise once, so a workspace that itself sits behind a symlink
    // (/tmp on macOS, for one) does not fail every containment check below.
    this.root = await fs.realpath(this.root);
  }

  /**
   * Turn a model-supplied path into an absolute path inside the workspace.
   * Throws if it escapes.
   *
   * Two checks, because they catch different things: the lexical one rejects
   * "../" traversal, and the realpath one rejects a symlink planted inside the
   * workspace that points out of it. For a path that does not exist yet we walk
   * up to the nearest ancestor that does, since that is what the write will
   * actually land under.
   */
  async resolve(rel) {
    if (typeof rel !== 'string' || rel.trim() === '') {
      throw new Error('path is required');
    }
    const cleaned = rel.replace(/^\/+/, '');
    const abs = path.resolve(this.root, cleaned);
    if (!this.#inside(abs)) {
      throw new Error(`path escapes the workspace: ${rel}`);
    }
    if (abs === this.root) return abs;

    let probe = abs;
    while (true) {
      let real;
      try {
        real = await fs.realpath(probe);
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
        const parent = path.dirname(probe);
        if (parent === probe || !this.#inside(parent)) return abs; // reached the root
        probe = parent;
        continue;
      }
      if (!this.#inside(real)) {
        throw new Error(`path escapes the workspace via a symlink: ${rel}`);
      }
      return abs;
    }
  }

  #inside(candidate) {
    return candidate === this.root || candidate.startsWith(this.root + path.sep);
  }

  rel(abs) {
    return path.relative(this.root, abs).split(path.sep).join('/') || '.';
  }

  async list(dir = '.') {
    const abs = await this.resolve(dir === '' ? '.' : dir);
    const out = [];
    const walk = async (current, depth) => {
      if (depth > 6) return;
      let entries;
      try {
        entries = await fs.readdir(current, { withFileTypes: true });
      } catch (err) {
        if (err.code === 'ENOENT') return;
        throw err;
      }
      for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (entry.name.startsWith('.') && entry.name !== '.gitignore') continue;
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (SKIP_DIRS.has(entry.name)) continue;
          out.push({ path: this.rel(full), type: 'dir' });
          await walk(full, depth + 1);
        } else if (entry.isFile()) {
          const stat = await fs.stat(full).catch(() => null);
          out.push({ path: this.rel(full), type: 'file', size: stat ? stat.size : 0 });
        }
      }
    };
    await walk(abs, 0);
    return out;
  }

  async read(rel) {
    const abs = await this.resolve(rel);
    let stat;
    try {
      stat = await fs.stat(abs);
    } catch (err) {
      // Keep messages workspace-relative: the model should reason about paths
      // it can actually use, not about where the workspace lives on disk.
      if (err.code === 'ENOENT') throw new Error(`${this.rel(abs)} does not exist. Use list_files to see what is there.`);
      throw err;
    }
    if (stat.isDirectory()) throw new Error(`${this.rel(abs)} is a folder, not a file. Use list_files to see inside it.`);
    if (stat.size > MAX_READ) {
      throw new Error(`${this.rel(abs)} is ${stat.size} bytes, over the ${MAX_READ} byte read limit`);
    }
    return fs.readFile(abs, 'utf8');
  }

  async write(rel, content) {
    const abs = await this.resolve(rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content ?? '', 'utf8');
    return this.rel(abs);
  }

  /** Literal find-and-replace. The model gets an error rather than a silent no-op. */
  async edit(rel, find, replace, replaceAll = false) {
    const original = await this.read(rel);
    if (!original.includes(find)) {
      throw new Error(`the text to replace was not found in ${rel}`);
    }
    if (!replaceAll) {
      const first = original.indexOf(find);
      if (original.indexOf(find, first + find.length) !== -1) {
        throw new Error(`the text to replace appears more than once in ${rel}; pass replace_all or include more surrounding context`);
      }
    }
    const updated = replaceAll ? original.split(find).join(replace) : original.replace(find, replace);
    await this.write(rel, updated);
    return this.rel(await this.resolve(rel));
  }

  async remove(rel) {
    const abs = await this.resolve(rel);
    if (abs === this.root) throw new Error('refusing to delete the workspace root');
    await fs.rm(abs, { recursive: true, force: true });
    return this.rel(abs);
  }

  /** Plain substring search across the tree, for when the model needs to find code. */
  async grep(query, limit = 60) {
    const files = (await this.list('.')).filter((f) => f.type === 'file');
    const needle = query.toLowerCase();
    const hits = [];
    for (const file of files) {
      if (hits.length >= limit) break;
      let text;
      try {
        text = await this.read(file.path);
      } catch {
        continue; // binary or oversized
      }
      const lines = text.split('\n');
      for (let i = 0; i < lines.length && hits.length < limit; i++) {
        if (lines[i].toLowerCase().includes(needle)) {
          hits.push({ path: file.path, line: i + 1, text: lines[i].slice(0, 300).trim() });
        }
      }
    }
    return hits;
  }
}
