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

  async request(path, { method = 'GET', body, contentType, raw = false } = {}) {
    const url = path.startsWith('http') ? path : `${BASE}${path}`;
    const headers = { 'x-api-key': this.apiKey };
    if (contentType) headers['Content-Type'] = contentType;

    let response;
    try {
      response = await this.fetch(url, { method, headers, body });
    } catch (cause) {
      throw new OpenCloudError(`Could not reach Roblox (${cause.message}) [${url}]`, { url });
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

/** Verify a key/universe/place triple, returning what Roblox knows about them. */
export async function verifyCredentials({ apiKey, universeId, placeId, fetchImpl }) {
  const client = new OpenCloud({ apiKey, universeId, placeId, fetchImpl });
  const universe = await client.getUniverse();
  let place = null;
  if (placeId) {
    place = await client.getPlace().catch((error) => ({ error: error.message }));
  }
  return { universe, place };
}
