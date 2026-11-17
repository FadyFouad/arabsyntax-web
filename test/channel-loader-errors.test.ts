import { describe, it, expect, vi, beforeEach } from 'vitest';

// The channel loader is fatal by design (it only runs during prerender, so a
// throw fails the build). The real file is valid, so the failure paths are
// reached by mocking node:fs — same technique as videos-loader-errors.

vi.mock('server-only', () => ({}));

let fileContents: string | null = null;
let reads = 0;

vi.mock('node:fs', () => ({
  readFileSync: (p: string) => {
    reads += 1;
    if (fileContents === null) throw Object.assign(new Error(`ENOENT: no such file, open '${p}'`), { code: 'ENOENT' });
    return fileContents;
  },
}));

async function freshLoader() {
  vi.resetModules(); // drop the loader's module-level cache
  return import('@/lib/channel/loader');
}

const channel = (overrides: Record<string, unknown> = {}) => ({
  channelUrl: 'https://www.youtube.com/@alnahwalkafi',
  trailer: {
    youtubeId: '2eDsj0cbCcU',
    title: { ar: 'عنوان', en: 'Title' },
    uploadDate: '2026-11-17',
    durationSeconds: 48,
  },
  ...overrides,
});

beforeEach(() => {
  fileContents = null;
  reads = 0;
});

describe('channel loader — failure paths', () => {
  it('throws when content/channel.json is missing', async () => {
    const { getChannel } = await freshLoader();
    expect(() => getChannel()).toThrow(/content\/channel\.json could not be read: ENOENT/);
  });

  it('throws when the file is not valid JSON', async () => {
    fileContents = '{ "channelUrl": ';
    const { getChannel } = await freshLoader();
    expect(() => getChannel()).toThrow(/content\/channel\.json could not be read/);
  });

  it('throws on a non-YouTube channel URL', async () => {
    fileContents = JSON.stringify(channel({ channelUrl: 'https://example.com/@alnahwalkafi' }));
    const { getChannel } = await freshLoader();
    expect(() => getChannel()).toThrow(/content\/channel\.json is invalid[\s\S]*channelUrl/);
  });

  it('does not cache a failure: a fixed file loads on the next call', async () => {
    fileContents = JSON.stringify(channel({ channelUrl: 'nope' }));
    const { getChannel } = await freshLoader();
    expect(() => getChannel()).toThrow();
    fileContents = JSON.stringify(channel());
    expect(getChannel().trailer.youtubeId).toBe('2eDsj0cbCcU');
  });

  it('reads the file once, then serves from memory', async () => {
    fileContents = JSON.stringify(channel());
    const { getChannel } = await freshLoader();
    getChannel();
    getChannel();
    expect(reads).toBe(1);
  });
});
