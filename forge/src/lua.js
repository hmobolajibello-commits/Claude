// JSON -> Luau source. Used to compile a project's settings and map metadata
// into ModuleScripts the game reads at runtime, so designers edit JSON and the
// game never parses anything.

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const RESERVED = new Set([
  'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
  'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then', 'true',
  'until', 'while', 'continue', 'export', 'type',
]);

export function luaString(value) {
  const escaped = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return `"${escaped}"`;
}

function luaKey(key) {
  return IDENTIFIER.test(key) && !RESERVED.has(key) ? key : `[${luaString(key)}]`;
}

/** Serialize a JSON-ish value as a Luau expression. */
export function toLua(value, depth = 0) {
  const pad = '\t'.repeat(depth + 1);
  const closePad = '\t'.repeat(depth);

  if (value === null || value === undefined) return 'nil';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Cannot emit ${value} as Luau`);
    return String(value);
  }
  if (typeof value === 'string') return luaString(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return '{}';
    const items = value.map((item) => `${pad}${toLua(item, depth + 1)},`);
    return ['{', ...items, `${closePad}}`].join('\n');
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return '{}';
    const items = entries.map(([key, item]) => `${pad}${luaKey(key)} = ${toLua(item, depth + 1)},`);
    return ['{', ...items, `${closePad}}`].join('\n');
  }

  throw new Error(`Cannot emit ${typeof value} as Luau`);
}

/** A complete ModuleScript that returns the given value. */
export function luaModule(value, header) {
  const comment = header ? `-- ${header.split('\n').join('\n-- ')}\n\n` : '';
  return `${comment}return ${toLua(value)}\n`;
}
