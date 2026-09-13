import test from 'node:test';
import assert from 'node:assert/strict';
import { guardUrl, htmlToText, extractTitle, extractLinks, webSearch } from '../lib/browse.js';

test('blocks schemes that are not http(s)', async () => {
  for (const bad of ['file:///etc/passwd', 'gopher://x/', 'ftp://x/']) {
    await assert.rejects(() => guardUrl(bad), /only http and https/);
  }
});

test('blocks private and link-local address space', async () => {
  const blocked = [
    'http://127.0.0.1/', 'http://10.0.0.5/', 'http://192.168.1.1/', 'http://172.16.5.4/',
    'http://169.254.169.254/latest/meta-data/', 'http://[::1]/', 'http://[fd00::1]/',
    'http://0.0.0.0/', 'http://100.64.0.1/',
  ];
  for (const url of blocked) {
    await assert.rejects(() => guardUrl(url), /private address/, url);
  }
});

test('blocks hostnames that name the local machine or a metadata service', async () => {
  for (const url of ['http://localhost:8080/', 'http://metadata.google.internal/', 'http://box.local/']) {
    await assert.rejects(() => guardUrl(url), /private host/, url);
  }
});

test('allows ordinary public URLs', async () => {
  assert.equal((await guardUrl('https://example.com/a?b=1')).hostname, 'example.com');
});

test('allowPrivate opts out, for deliberate local use', async () => {
  assert.equal((await guardUrl('http://127.0.0.1:3000/', { allowPrivate: true })).port, '3000');
});

test('turns a page into readable text', () => {
  const html = `<html><head><title>Docs &amp; Guides</title><style>p{color:red}</style></head>
    <body><script>alert(1)</script><h1>Heading</h1><p>Some <b>bold</b> text.</p>
    <ul><li>one</li><li>two</li></ul></body></html>`;
  assert.equal(extractTitle(html), 'Docs & Guides');
  const text = htmlToText(html);
  assert.match(text, /Heading/);
  assert.match(text, /Some bold text\./);
  assert.match(text, /- one\n- two/);
  assert.doesNotMatch(text, /alert|color:red/, 'script and style content must be dropped');
});

test('resolves links against the page they came from', () => {
  const links = extractLinks('<a href="/next">Next</a><a href="https://x.test/a">Ext</a>', 'https://site.test/dir/');
  assert.deepEqual(links.map((l) => l.url), ['https://site.test/next', 'https://x.test/a']);
});

// The search parser is the most fragile part, so pin both markup shapes
// DuckDuckGo actually serves, including attribute order.
const LITE = `<table>
<tr><td><a rel="nofollow" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fmdn.test%2Ffetch&amp;rut=a" class='result-link'>Fetch API</a></td></tr>
<tr><td class='result-snippet'>Fetching resources &amp; more.</td></tr></table>`;

const FULL = `<div class="result"><h2><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fnode.test%2Ffs">Node fs</a></h2>
<a class="result__snippet" href="#">The <b>fs</b> module.</a></div>`;

function withHtml(html, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(html, { status: 200, headers: { 'content-type': 'text/html' } });
  return fn().finally(() => { globalThis.fetch = original; });
}

test('parses lite results even though href precedes class', async () => {
  const results = await withHtml(LITE, () => webSearch('fetch'));
  assert.equal(results.length, 1);
  assert.equal(results[0].url, 'https://mdn.test/fetch');
  assert.equal(results[0].title, 'Fetch API');
  assert.equal(results[0].snippet, 'Fetching resources & more.');
});

test('parses the full html layout too', async () => {
  const results = await withHtml(FULL, () => webSearch('fs'));
  assert.equal(results[0].url, 'https://node.test/fs');
  assert.match(results[0].snippet, /fs module/);
});

test('a page with no results yields none rather than junk', async () => {
  const results = await withHtml('<html><body>No results found.</body></html>', () => webSearch('zzz'));
  assert.deepEqual(results, []);
});

test('an empty query is rejected before any request', async () => {
  await assert.rejects(() => webSearch('   '), /query is required/);
});
