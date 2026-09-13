// A structural check over the Luau runtime.
//
// There is no Luau interpreter in this repo, so this is not a parser -- it
// strips comments and string literals, then checks that block keywords balance.
// It catches the failures that actually happen when a module is edited or
// generated: a truncated file, a missing `end`, a stray `end`.

export function stripLuau(source) {
  let out = '';
  let index = 0;
  const { length } = source;

  while (index < length) {
    const rest = source.slice(index);

    // Long comment or long string: --[[ ]] / --[=[ ]=] / [[ ]] / [=[ ]=]
    const long = rest.match(/^(--)?\[(=*)\[/);
    if (long) {
      const close = `]${long[2]}]`;
      const end = source.indexOf(close, index + long[0].length);
      index = end === -1 ? length : end + close.length;
      out += ' ';
      continue;
    }
    if (rest.startsWith('--')) {
      const end = source.indexOf('\n', index);
      index = end === -1 ? length : end;
      out += ' ';
      continue;
    }
    const quote = rest[0];
    if (quote === '"' || quote === "'") {
      index += 1;
      while (index < length && source[index] !== quote) {
        index += source[index] === '\\' ? 2 : 1;
      }
      index += 1;
      out += ' ';
      continue;
    }
    out += source[index];
    index += 1;
  }
  return out;
}

const count = (text, word) => (text.match(new RegExp(`\\b${word}\\b`, 'g')) ?? []).length;

/**
 * @returns {{balanced: boolean, opens: number, ends: number, repeats: number, untils: number}}
 */
export function checkBalance(source) {
  const code = stripLuau(source);

  // Each `function`, `do` and `then` opens a block closed by `end` -- except
  // that `elseif ... then` reuses the enclosing `if`'s `end`.
  const opens = count(code, 'function') + count(code, 'do') + count(code, 'then') - count(code, 'elseif');
  const ends = count(code, 'end');
  const repeats = count(code, 'repeat');
  const untils = count(code, 'until');

  return { balanced: opens === ends && repeats === untils, opens, ends, repeats, untils };
}
