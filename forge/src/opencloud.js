// Roblox Open Cloud client.
//
// Open Cloud is the only supported way for an external tool to reach a Roblox
// experience. It authenticates with an API key you create at
// https://create.roblox.com/dashboard/credentials -- never with account
// credentials -- and every call is scoped to universes you picked when creating
// the key. Roblox does not expose an endpoint that lists your universes, so the
// universe and place IDs are supplied once by the user at link time.

const BASE = 'https://apis.roblox.com';

export class OpenCloudError extends Error {
  constructor(message, { status, body, url } = {}) {
    super(message);
    this.name = 'OpenCloudError';
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

/**
 * Node's fetch reports every network problem as "fetch failed" and hides the
 * real reason one level down in `cause`. Walk the chain and name it, so a
 * blocked port, a DNS failure and a dropped connection are distinguishable.
 */
export function describeNetworkFailure(error) {
  const chain = [];
  for (let current = error, depth = 0; current && depth < 5; current = current.cause, depth += 1) {
    const code = current.code ? ` (${current.code})` : '';
    const text = `${current.message ?? current}${code}`;
    if (text && !chain.includes(text)) chain.push(text);
  }

  const codes = chain.join(' <- ');
  const hints = [
    [/ENOTFOUND|EAI_AGAIN/, 'DNS could not resolve apis.roblox.com -- check your internet connection'],
    [/ECONNREFUSED/, 'the connection was refused -- a firewall or proxy may be blocking it'],
    [/ECONNRESET|EPIPE/, 'the connection dropped mid-request -- often antivirus, a VPN, or a flaky network'],
    [/ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|timeout/i, 'the connection timed out -- check your internet, or try again'],
    [/CERT|SELF_SIGNED|UNABLE_TO_VERIFY/i, 'the HTTPS certificate was rejected -- antivirus HTTPS scanning or a corporate proxy does this'],
  ];
  const hint = hints.find(([pattern]) => pattern.test(codes))?.[1];
  return hint ? `${codes} -- ${hint}` : codes;
}

/** Turn Roblox's error shapes into one readable message. */
function describeFailure(status, text, url) {
  let detail = text?.trim() ?? '';
  try {
    const parsed = JSON.parse(text);
    detail = parsed.message || parsed.error || parsed.errors?.[0]?.message || detail;
  } catch {
    // Non-JSON body (HTML error page, empty) -- keep the raw text.
  }
  const hints = {
    401: 'the API key was rejected (check for a typo or an expired key)',
    403: 'the API key is missing a required scope, or is not allowed for this universe/place',
    404: 'not found (check the universe ID and place ID)',
    429: 'rate limited by Roblox -- wait a moment and retry',
  };
  const hint = hints[status];
  return `Roblox Open Cloud ${status}${hint ? ` -- ${hint}` : ''}${detail ? `: ${detail.slice(0, 400)}` : ''} [${url}]`;
}

export class OpenCloud {
  /**
   * @param {object} options
   * @param {string} options.apiKey Open Cloud API key
   * @param {string|number} [options.universeId]
   * @param {string|number} [options.placeId]
   * @param {typeof fetch} [options.fetchImpl] injectable for tests
   */
  constructor({ apiKey, universeId, placeId, fetchImpl = fetch } = {}) {
    if (!apiKey) throw new OpenCloudError('No Roblox API key. Run `forge link` first.');
    this.apiKey = apiKey;
    this.universeId = universeId ? String(universeId) : undefined;
    this.placeId = placeId ? String(placeId) : undefined;
    this.fetch = fetchImpl;
  }

  async request(path, { method = 'GET', body, contentType, raw = false, attempts = 3 } = {}) {
    const url = path.startsWith('http') ? path : `${BASE}${path}`;
    const headers = { 'x-api-key': this.apiKey };
    if (contentType) headers['Content-Type'] = contentType;

    let response;
    for (let attempt = 1; ; attempt += 1) {
      try {
        response = await this.fetch(url, { method, headers, body });
        break;
      } catch (cause) {
        // A dropped connection mid-upload is common and usually transient, so
        // retry before giving up. Only network failures land here -- an HTTP
        // error is a response, and handled below.
        if (attempt < attempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
          continue;
        }
        throw new OpenCloudError(
          `Could not reach Roblox after ${attempts} tries: ${describeNetworkFailure(cause)} [${url}]`,
          { url, cause },
        );
      }
    }

    const text = await response.text();
    if (!response.ok) {
      throw new OpenCloudError(describeFailure(response.status, text, url), {
        status: response.status,
        body: text,
        url,
      });
    }
    if (raw) return text;
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }

  requireTarget() {
    if (!this.universeId) throw new OpenCloudError('No universe ID configured. Run `forge link`.');
    if (!this.placeId) throw new OpenCloudError('No place ID configured. Run `forge link`.');
  }

  /** Read the linked universe -- the cheapest way to verify a key works. */
  getUniverse(universeId = this.universeId) {
    if (!universeId) throw new OpenCloudError('No universe ID given.');
    return this.request(`/cloud/v2/universes/${universeId}`);
  }

  getPlace(universeId = this.universeId, placeId = this.placeId) {
    return this.request(`/cloud/v2/universes/${universeId}/places/${placeId}`);
  }

  /**
   * Upload a place file, replacing the place's contents.
   * @param {string|Buffer} contents an .rbxlx document
   * @param {object} [options]
   * @param {'Published'|'Saved'} [options.versionType] Published goes live for
   *   players; Saved only updates the copy you open in Studio.
   * @returns {Promise<{versionNumber: number}>}
   */
  async publishPlace(contents, { versionType = 'Published', universeId = this.universeId, placeId = this.placeId } = {}) {
    if (!universeId || !placeId) this.requireTarget();
    const result = await this.request(
      `/universes/v1/${universeId}/places/${placeId}/versions?versionType=${versionType}`,
      { method: 'POST', body: contents, contentType: 'application/xml' },
    );
    return result;
  }

  /**
   * Run a Luau script inside a real server for the place, in the cloud.
   * Requires the place to have at least one published version.
   * @returns {Promise<{state: string, output: any, logs: string[], error?: object}>}
   */
  async runLuau(script, { universeId = this.universeId, placeId = this.placeId, version, timeoutMs = 180_000, pollMs = 2_000, onPoll } = {}) {
    if (!universeId || !placeId) this.requireTarget();

    // Luau execution runs against one specific place version. Roblox has no
    // "latest" alias here, so the caller supplies the version number that
    // `publishPlace` returned (forge remembers it in its config).
    const placeVersion = version;
    if (!placeVersion) {
      throw new OpenCloudError(
        'No place version to run against. Publish once with `forge deploy`, or pass --version <n>.',
      );
    }

    const task = await this.request(
      `/cloud/v2/universes/${universeId}/places/${placeId}/versions/${placeVersion}/luau-execution-session-tasks`,
      { method: 'POST', body: JSON.stringify({ script }), contentType: 'application/json' },
    );

    const deadline = Date.now() + timeoutMs;
    let current = task;
    while (current.state === 'QUEUED' || current.state === 'PROCESSING' || current.state === 'STATE_UNSPECIFIED') {
      if (Date.now() > deadline) {
        throw new OpenCloudError(`Cloud script did not finish within ${Math.round(timeoutMs / 1000)}s (state: ${current.state}).`);
      }
      onPoll?.(current.state);
      await new Promise((resolve) => setTimeout(resolve, pollMs));
      current = await this.request(`/cloud/v2/${current.path}`);
    }

    const logs = await this.getLuauLogs(current.path).catch(() => []);
    return {
      state: current.state,
      output: current.output?.results ?? current.output ?? null,
      error: current.error,
      logs,
    };
  }

  async getLuauLogs(taskPath) {
    const result = await this.request(`/cloud/v2/${taskPath}/logs?maxPageSize=1000`);
    const pages = result.luauExecutionSessionTaskLogs ?? [];
    return pages.flatMap((page) => page.messages ?? []);
  }
}

/**
 * Accept a place ID, or any of the roblox.com links that contain one, so
 * nobody has to go hunting for the number.
 * @returns {string|null} the place ID as digits
 */
export function parsePlaceId(input) {
  const text = String(input ?? '').trim();
  if (/^\d+$/.test(text)) return text;
  // https://www.roblox.com/games/1818/Classic-Crossroads
  const fromPath = text.match(/\/games\/(\d+)/);
  if (fromPath) return fromPath[1];
  // https://www.roblox.com/games/start?placeId=1818
  const fromQuery = text.match(/[?&]placeId=(\d+)/i);
  if (fromQuery) return fromQuery[1];
  return null;
}

/**
 * Best-effort lookup of the universe that contains a place.
 *
 * Open Cloud has no endpoint for this and none for listing your universes, so
 * this uses a legacy unauthenticated endpoint that Roblox may withdraw. It is
 * a convenience only -- every caller must cope with null and ask the user.
 *
 * @returns {Promise<string|null>} the universe ID, or null if it can't be found
 */
export async function findUniverseForPlace(placeId, { fetchImpl = fetch } = {}) {
  if (!/^\d+$/.test(String(placeId))) return null;
  try {
    const response = await fetchImpl(`${BASE}/universes/v1/places/${placeId}/universe`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const body = await response.json();
    const found = body?.universeId ?? body?.UniverseId;
    return found ? String(found) : null;
  } catch {
    return null;
  }
}

/**
 * Verify a key/universe/place triple.
 *
 * Reading the universe is only a courtesy -- it is how forge shows you the
 * game's name and proves the key reaches Roblox. A key scoped tightly to
 * `universe-places:write` (exactly what the docs tell you to create for
 * publishing) can be refused here and still publish perfectly well, so a
 * refusal is reported, never fatal. An outright bad key is still fatal: those
 * fail with 401, which means the key itself, not its permissions.
 *
 * @returns {Promise<{universe: object|null, universeError: string|null, place: object|null}>}
 */
export async function verifyCredentials({ apiKey, universeId, placeId, fetchImpl }) {
  const client = new OpenCloud({ apiKey, universeId, placeId, fetchImpl });

  let universe = null;
  let universeError = null;
  try {
    universe = await client.getUniverse();
  } catch (error) {
    if (error.status === 401) throw error;
    universeError = error.message;
  }

  let place = null;
  if (placeId) {
    place = await client.getPlace().catch((error) => ({ error: error.message }));
  }
  return { universe, universeError, place };
}
