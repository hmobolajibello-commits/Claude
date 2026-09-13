// Account connections.
//
// The design rule here: the model never sees a credential. It calls
// connection_call('github', 'GET', '/user') and the server attaches the token on
// the way out. So a prompt injection on some web page the AI is reading cannot
// talk it into printing your token — the token is not in the conversation at all.
//
// Each service is pinned to a host allowlist, so a connection you granted for
// GitHub cannot be aimed at some other domain.

import { promises as fs } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { guardUrl } from './browse.js';

/** Known services. `custom` lets you wire anything else without code changes. */
export const REGISTRY = {
  github: {
    label: 'GitHub', hosts: ['api.github.com'], baseUrl: 'https://api.github.com',
    auth: { type: 'header', name: 'authorization', prefix: 'Bearer ' },
    headers: { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
    tokenHelp: 'github.com/settings/tokens → fine-grained token. Grant only the repos and scopes you want the AI to touch.',
  },
  gitlab: {
    label: 'GitLab', hosts: ['gitlab.com'], baseUrl: 'https://gitlab.com/api/v4',
    auth: { type: 'header', name: 'private-token', prefix: '' },
    tokenHelp: 'gitlab.com/-/user_settings/personal_access_tokens',
  },
  notion: {
    label: 'Notion', hosts: ['api.notion.com'], baseUrl: 'https://api.notion.com/v1',
    auth: { type: 'header', name: 'authorization', prefix: 'Bearer ' },
    headers: { 'notion-version': '2022-06-28' },
    tokenHelp: 'notion.so/my-integrations → internal integration secret, then share the pages you want reachable with it.',
  },
  linear: {
    label: 'Linear', hosts: ['api.linear.app'], baseUrl: 'https://api.linear.app',
    auth: { type: 'header', name: 'authorization', prefix: '' },
    tokenHelp: 'linear.app/settings/api → personal API key. Use POST /graphql.',
  },
  slack: {
    label: 'Slack', hosts: ['slack.com'], baseUrl: 'https://slack.com/api',
    auth: { type: 'header', name: 'authorization', prefix: 'Bearer ' },
    tokenHelp: 'api.slack.com/apps → OAuth bot token (xoxb-…).',
  },
  google: {
    label: 'Google', hosts: ['www.googleapis.com', 'gmail.googleapis.com', 'calendar.googleapis.com', 'sheets.googleapis.com', 'drive.googleapis.com'],
    baseUrl: 'https://www.googleapis.com',
    auth: { type: 'header', name: 'authorization', prefix: 'Bearer ' },
    tokenHelp: 'developers.google.com/oauthplayground → authorize the scopes you want and copy the access token. These expire in about an hour.',
  },
  todoist: {
    label: 'Todoist', hosts: ['api.todoist.com'], baseUrl: 'https://api.todoist.com/rest/v2',
    auth: { type: 'header', name: 'authorization', prefix: 'Bearer ' },
    tokenHelp: 'todoist.com/app/settings/integrations/developer',
  },
  airtable: {
    label: 'Airtable', hosts: ['api.airtable.com'], baseUrl: 'https://api.airtable.com/v0',
    auth: { type: 'header', name: 'authorization', prefix: 'Bearer ' },
    tokenHelp: 'airtable.com/create/tokens',
  },
  jira: {
    label: 'Jira', hosts: [], baseUrl: '',
    auth: { type: 'basic' }, needsBaseUrl: true,
    tokenHelp: 'id.atlassian.com/manage-profile/security/api-tokens. Username is your email, password is the API token. Base URL: https://YOUR.atlassian.net/rest/api/3',
  },
  discord: {
    label: 'Discord', hosts: ['discord.com'], baseUrl: 'https://discord.com/api/v10',
    auth: { type: 'header', name: 'authorization', prefix: 'Bot ' },
    tokenHelp: 'discord.com/developers/applications → Bot → token',
  },
  custom: {
    label: 'Custom API', hosts: [], baseUrl: '', needsBaseUrl: true,
    auth: { type: 'header', name: 'authorization', prefix: 'Bearer ' },
    tokenHelp: 'Any HTTP API. Set the base URL, and the header name if it is not Authorization: Bearer.',
  },
};

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Optional encryption at rest, keyed off STUDIO_SECRET. */
function cipherKey(secret, salt) {
  return crypto.scryptSync(secret, salt, 32);
}

function encrypt(plain, secret) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', cipherKey(secret, salt), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `enc:v1:${salt.toString('base64')}:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${body.toString('base64')}`;
}

function decrypt(value, secret) {
  if (!value.startsWith('enc:v1:')) return value;
  if (!secret) throw new Error('this connection is encrypted but STUDIO_SECRET is not set');
  const [, , salt, iv, tag, body] = value.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', cipherKey(secret, Buffer.from(salt, 'base64')), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString('utf8');
}

export class Connections {
  constructor(file, { secret = process.env.STUDIO_SECRET || '' } = {}) {
    this.file = file;
    this.secret = secret;
    this.items = new Map();
  }

  async load() {
    try {
      const parsed = JSON.parse(await fs.readFile(this.file, 'utf8'));
      for (const item of parsed.connections || []) this.items.set(item.id, item);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  async save() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const body = JSON.stringify({ connections: [...this.items.values()] }, null, 2);
    await fs.writeFile(this.file, body, { encoding: 'utf8', mode: 0o600 });
    await fs.chmod(this.file, 0o600).catch(() => {});
  }

  /** Everything the UI and the model may see — credentials deliberately excluded. */
  list() {
    return [...this.items.values()].map((item) => ({
      id: item.id,
      service: item.service,
      label: item.label,
      baseUrl: item.baseUrl,
      allowWrites: !!item.allowWrites,
      note: item.note || '',
      addedAt: item.addedAt,
    }));
  }

  async add({ id, service, label, token, username, baseUrl, headerName, allowWrites = false, note = '' }) {
    const spec = REGISTRY[service];
    if (!spec) throw new Error(`unknown service: ${service}`);
    if (!token) throw new Error('a token is required');

    let resolvedBase = spec.baseUrl;
    let hosts = spec.hosts;
    if (spec.needsBaseUrl || baseUrl) {
      if (!baseUrl) throw new Error(`${spec.label} needs a base URL`);
      const url = await guardUrl(baseUrl);
      resolvedBase = url.toString().replace(/\/$/, '');
      hosts = [...new Set([...(spec.hosts || []), url.hostname])];
    }

    const connId = id || service;
    this.items.set(connId, {
      id: connId,
      service,
      label: label || spec.label,
      baseUrl: resolvedBase,
      hosts,
      headerName: headerName || spec.auth?.name || 'authorization',
      username: username || '',
      allowWrites: !!allowWrites,
      note,
      addedAt: new Date().toISOString(),
      token: this.secret ? encrypt(token, this.secret) : token,
      encrypted: !!this.secret,
    });
    await this.save();
    return this.list().find((c) => c.id === connId);
  }

  async remove(id) {
    const existed = this.items.delete(id);
    if (existed) await this.save();
    return existed;
  }

  /**
   * Perform a request on a connection's behalf. Callers pass only a path — the
   * host comes from the stored connection, never from the model.
   */
  async call(id, { method = 'GET', path: reqPath = '/', body, query, headers = {} } = {}) {
    const item = this.items.get(id);
    if (!item) throw new Error(`no connection named "${id}". Connect it in the Accounts panel first.`);

    const upper = String(method).toUpperCase();
    if (WRITE_METHODS.has(upper) && !item.allowWrites) {
      throw new Error(`the "${item.id}" connection is read-only. Turn on write access for it in the Accounts panel if you want ${upper} requests.`);
    }

    const url = new URL(String(reqPath).replace(/^(?!\/)/, '/').replace(/^\//, ''), item.baseUrl.replace(/\/?$/, '/'));
    if (!item.hosts.includes(url.hostname)) {
      throw new Error(`the "${item.id}" connection may only reach ${item.hosts.join(', ')}, not ${url.hostname}`);
    }
    if (query && typeof query === 'object') {
      for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
    }

    const spec = REGISTRY[item.service] || REGISTRY.custom;
    const token = decrypt(item.token, this.secret);
    const outHeaders = { accept: 'application/json', 'user-agent': 'VoiceStudio/1.0', ...(spec.headers || {}), ...headers };
    if (spec.auth?.type === 'basic') {
      outHeaders.authorization = `Basic ${Buffer.from(`${item.username}:${token}`).toString('base64')}`;
    } else {
      outHeaders[item.headerName] = `${spec.auth?.prefix ?? ''}${token}`;
    }

    let payload;
    if (body !== undefined && body !== null && upper !== 'GET' && upper !== 'HEAD') {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      if (!outHeaders['content-type']) outHeaders['content-type'] = 'application/json';
    }

    await guardUrl(url.toString()); // no private address space, even via a connection
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    let res;
    try {
      res = await fetch(url, { method: upper, headers: outHeaders, body: payload, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    let parsed = text;
    try {
      parsed = JSON.parse(text);
    } catch { /* leave as text */ }

    return {
      status: res.status,
      ok: res.ok,
      url: url.toString().replace(/([?&](access_token|key|token)=)[^&]+/gi, '$1[redacted]'),
      body: typeof parsed === 'string' ? parsed.slice(0, 20_000) : parsed,
    };
  }
}
