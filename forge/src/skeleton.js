// Build a place by injecting into a known-good one, instead of synthesising it.
//
// Roblox's publish endpoint validates the document and refuses anything it
// does not recognise as a place, with only "Invalid Content stream" to go on.
// A place written from scratch -- even a well-formed one holding a correctly
// propertied Workspace -- is refused, while a Studio-written place is accepted.
// Roblox does not document what the difference is.
//
// So forge does not guess. It takes a place file Studio produced, finds the
// services it cares about, and splices its own instances in as children. The
// skeleton's own structure, service set and properties are left exactly as
// Studio wrote them.

export class SkeletonError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SkeletonError';
  }
}

/**
 * Find where a service's children end, so new ones can be appended there.
 *
 * Walks from the service's opening <Item> tag, counting nested <Item> elements
 * until the matching close, rather than regex-matching a closing tag that could
 * belong to any descendant.
 *
 * @returns {number} the index of the service's own closing </Item>
 */
export function findServiceClose(xml, className) {
  const open = new RegExp(`<Item class="${className}"[^>]*>`);
  const match = open.exec(xml);
  if (!match) throw new SkeletonError(`the skeleton has no ${className} service`);

  let depth = 1;
  let cursor = match.index + match[0].length;
  const token = /<Item\b[^>]*?(\/?)>|<\/Item>/g;
  token.lastIndex = cursor;

  for (let found = token.exec(xml); found; found = token.exec(xml)) {
    if (found[0] === '</Item>') {
      depth -= 1;
      if (depth === 0) return found.index;
    } else if (found[1] !== '/') {
      depth += 1;
    }
    cursor = token.lastIndex;
  }
  throw new SkeletonError(`the skeleton's ${className} is never closed`);
}

/** Indent a serialized fragment to sit at the given depth. */
function reindent(fragment, depth) {
  const pad = '\t'.repeat(depth);
  return fragment
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => `${pad}${line}`)
    .join('\n');
}

/**
 * Splice instances into a Studio-written place.
 *
 * @param {string} skeleton the contents of a .rbxlx file Studio produced
 * @param {Array<{service: string, depth: number, xml: string}>} injections
 * @returns {string} the combined place file
 */
export function injectIntoSkeleton(skeleton, injections) {
  if (!/^\s*<roblox\b/.test(skeleton)) {
    throw new SkeletonError('that file does not look like a .rbxlx place (no <roblox> element)');
  }

  // Apply back-to-front so each insertion cannot move the offsets of the next.
  const planned = injections
    .filter((entry) => entry.xml.trim().length > 0)
    .map((entry) => ({ ...entry, at: findServiceClose(skeleton, entry.service) }))
    .sort((a, b) => b.at - a.at);

  let out = skeleton;
  for (const entry of planned) {
    out = `${out.slice(0, entry.at)}${reindent(entry.xml, entry.depth)}\n${'\t'.repeat(entry.depth - 1)}${out.slice(entry.at)}`;
  }
  return out;
}

/**
 * Remove Studio's default grey baseplate, which would otherwise sit under a
 * generated map and collide with it. Matched by name, and only when it carries
 * no children, so nothing a user added is ever dropped.
 */
export function removeDefaultBaseplate(xml) {
  const pattern = /\n\t\t<Item class="Part"[^>]*>\s*<Properties>(?:(?!<Item )[\s\S])*?<string name="Name">Baseplate<\/string>[\s\S]*?<\/Properties>\s*<\/Item>/;
  return xml.replace(pattern, '');
}
