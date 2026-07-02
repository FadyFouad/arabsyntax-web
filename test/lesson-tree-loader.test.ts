import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Isolate the loader from the real filesystem + catalog so we can drive its
// fail-safe branches (spec FR-004): a malformed asset or an invalid definition
// must yield null (+ a logged error), never a throw at render.

const h = vi.hoisted(() => ({
  readFileSync: vi.fn(),
  getAllSlugs: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('node:fs', () => ({ readFileSync: h.readFileSync }));
vi.mock('@/lib/lessons/loader', () => ({ getAllSlugs: h.getAllSlugs }));

async function freshLoader() {
  vi.resetModules(); // clears the module-level layout/definition caches
  return import('@/lib/lessons/tree/loader');
}

const validTree = JSON.stringify({
  schemaVersion: 1,
  nodes: [
    { id: 'a', lessonId: 'a', title: 'A', prerequisites: [] },
    { id: 'b', lessonId: 'b', title: 'B', prerequisites: ['a'] },
  ],
});

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  h.readFileSync.mockReset();
  h.getAllSlugs.mockReset();
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe('getTreeLayout fail-safe', () => {
  it('returns a layout for a valid asset + covered catalog', async () => {
    h.readFileSync.mockReturnValue(validTree);
    h.getAllSlugs.mockReturnValue(['a', 'b']);
    const { getTreeLayout } = await freshLoader();
    const layout = getTreeLayout();
    expect(layout).not.toBeNull();
    expect(layout!.nodes).toHaveLength(2);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('returns null and logs when the definition has structural violations', async () => {
    h.readFileSync.mockReturnValue(
      JSON.stringify({
        schemaVersion: 1,
        nodes: [{ id: 'a', lessonId: 'ghost', title: 'A', prerequisites: [] }],
      }),
    );
    h.getAllSlugs.mockReturnValue(['a']); // 'ghost' is not a catalog lesson
    const { getTreeLayout } = await freshLoader();
    expect(getTreeLayout()).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('invalid tree.json'),
      expect.any(String),
    );
  });

  it('returns null and logs when the JSON is malformed', async () => {
    h.readFileSync.mockReturnValue('{ not json');
    h.getAllSlugs.mockReturnValue(['a']);
    const { getTreeLayout } = await freshLoader();
    expect(getTreeLayout()).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('returns null when the shape fails schema validation', async () => {
    h.readFileSync.mockReturnValue(JSON.stringify({ schemaVersion: 2, nodes: [] }));
    h.getAllSlugs.mockReturnValue(['a']);
    const { getTreeLayout } = await freshLoader();
    expect(getTreeLayout()).toBeNull();
  });

  it('memoizes: the asset is read only once across repeated calls', async () => {
    h.readFileSync.mockReturnValue(validTree);
    h.getAllSlugs.mockReturnValue(['a', 'b']);
    const { getTreeLayout } = await freshLoader();
    const first = getTreeLayout();
    const second = getTreeLayout();
    expect(second).toBe(first); // same cached object
    expect(h.readFileSync).toHaveBeenCalledTimes(1);
  });
});

describe('loadTreeDefinition', () => {
  it('throws on a malformed asset (used by the drift guard to surface breakage)', async () => {
    h.readFileSync.mockReturnValue('{ not json');
    const { loadTreeDefinition } = await freshLoader();
    expect(() => loadTreeDefinition()).toThrow();
  });

  it('returns the parsed definition for a valid asset', async () => {
    h.readFileSync.mockReturnValue(validTree);
    const { loadTreeDefinition } = await freshLoader();
    expect(loadTreeDefinition().nodes).toHaveLength(2);
  });
});
