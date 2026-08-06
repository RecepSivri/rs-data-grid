import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Fresh module instance per test so that module-level mutable state
// (gridConfig, fetchNonce, jsonError, the rerender/update hooks) never
// leaks between tests.
let mod: typeof import('./grid-settings');

beforeEach(async () => {
  vi.resetModules();
  mod = await import('./grid-settings');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('setSetting', () => {
  it('mutates gridConfig at the given key', () => {
    expect(mod.gridConfig.showFilter).toBe(true);
    mod.setSetting('showFilter', false);
    expect(mod.gridConfig.showFilter).toBe(false);
  });

  it('calls the registered update and rerender hooks', () => {
    const updateHook = vi.fn();
    const rerenderHook = vi.fn();
    mod.setUpdateHook(updateHook);
    mod.setRerenderHook(rerenderHook);

    mod.setSetting('showSort', false);

    expect(updateHook).toHaveBeenCalledTimes(1);
    expect(rerenderHook).toHaveBeenCalledTimes(1);
  });

  it('does not throw when no hooks have been registered', () => {
    expect(() => mod.setSetting('showSort', false)).not.toThrow();
  });
});

describe('commitStringSetting', () => {
  it('parses pagingSizes as a comma-separated numeric list', () => {
    mod.commitStringSetting('pagingSizes', '10,20,50');
    expect(mod.gridConfig.pagingSizes).toEqual([10, 20, 50]);
  });

  it('trims whitespace around each pagingSizes segment', () => {
    mod.commitStringSetting('pagingSizes', ' 10 , 20 , 30 ');
    expect(mod.gridConfig.pagingSizes).toEqual([10, 20, 30]);
  });

  it('drops non-numeric segments from pagingSizes', () => {
    mod.commitStringSetting('pagingSizes', '10,abc,50');
    expect(mod.gridConfig.pagingSizes).toEqual([10, 50]);
  });

  it('sets pagingSizes to an empty array when every segment is non-numeric', () => {
    mod.commitStringSetting('pagingSizes', 'abc,def');
    expect(mod.gridConfig.pagingSizes).toEqual([]);
  });

  it('commits non-pagingSizes keys as the raw string, unparsed', () => {
    mod.commitStringSetting('fetchUrl', 'https://example.com/api');
    expect(mod.gridConfig.fetchUrl).toBe('https://example.com/api');
  });

  it('triggers notifyChange via setSetting', () => {
    const rerenderHook = vi.fn();
    mod.setRerenderHook(rerenderHook);
    mod.commitStringSetting('authToken', 'tok');
    expect(rerenderHook).toHaveBeenCalledTimes(1);
  });
});

describe('commitHeadersSetting', () => {
  it('parses Key: Value lines into a headers object', () => {
    mod.commitHeadersSetting('Content-Type: application/json\nAuthorization: Bearer xyz');
    expect(mod.gridConfig.apiHeaders).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer xyz',
    });
  });

  it('stores the raw text verbatim in apiHeadersRaw', () => {
    const raw = 'Content-Type: application/json\nX-Test:   spaced value  ';
    mod.commitHeadersSetting(raw);
    expect(mod.gridConfig.apiHeadersRaw).toBe(raw);
    expect(mod.gridConfig.apiHeaders['X-Test']).toBe('spaced value');
  });

  it('skips lines with no colon separator', () => {
    mod.commitHeadersSetting('NoColonHere\nContent-Type: application/json');
    expect(mod.gridConfig.apiHeaders).toEqual({ 'Content-Type': 'application/json' });
  });

  it('skips lines whose key trims to empty', () => {
    mod.commitHeadersSetting(':valueOnly\nContent-Type: application/json');
    expect(mod.gridConfig.apiHeaders).toEqual({ 'Content-Type': 'application/json' });
  });

  it('handles an entirely empty string (no headers)', () => {
    mod.commitHeadersSetting('');
    expect(mod.gridConfig.apiHeaders).toEqual({});
    expect(mod.gridConfig.apiHeadersRaw).toBe('');
  });

  it('calls notifyChange', () => {
    const updateHook = vi.fn();
    mod.setUpdateHook(updateHook);
    mod.commitHeadersSetting('A: B');
    expect(updateHook).toHaveBeenCalledTimes(1);
  });
});

describe('commitJsonSetting / parseLooseJson', () => {
  it('accepts strict JSON objects and wraps them in an array', () => {
    mod.commitJsonSetting('dataSource', '{"a":1}');
    expect(mod.gridConfig.dataSource).toEqual([{ a: 1 }]);
    expect(mod.jsonError).toBeNull();
  });

  it('accepts strict JSON arrays as-is (no extra wrapping)', () => {
    mod.commitJsonSetting('dataSource', '[1,2,3]');
    expect(mod.gridConfig.dataSource).toEqual([1, 2, 3]);
  });

  it('falls back to parsing single-quoted strings as valid JSON', () => {
    mod.commitJsonSetting('dataSource', "{'name': 'Bob'}");
    expect(mod.gridConfig.dataSource).toEqual([{ name: 'Bob' }]);
    expect(mod.jsonError).toBeNull();
  });

  it('falls back to quoting unquoted object keys', () => {
    mod.commitJsonSetting('dataSource', '{a: 1, b: 2}');
    expect(mod.gridConfig.dataSource).toEqual([{ a: 1, b: 2 }]);
  });

  it('handles both single-quoted strings and unquoted keys together', () => {
    mod.commitJsonSetting('dataSource', "{name: 'Bob', age: 5}");
    expect(mod.gridConfig.dataSource).toEqual([{ name: 'Bob', age: 5 }]);
  });

  it('unescapes escaped single quotes inside single-quoted strings', () => {
    mod.commitJsonSetting('dataSource', "{'note': 'it\\'s fine'}");
    expect(mod.gridConfig.dataSource).toEqual([{ note: "it's fine" }]);
  });

  it('escapes embedded double quotes when converting single-quoted strings', () => {
    mod.commitJsonSetting('dataSource', `{'note': 'say "hi"'}`);
    expect(mod.gridConfig.dataSource).toEqual([{ note: 'say "hi"' }]);
  });

  it('sets jsonError and does NOT apply the change on invalid JSON', () => {
    mod.setSetting('dataSource', [{ existing: true }]);
    const updateHook = vi.fn();
    mod.setUpdateHook(updateHook);

    mod.commitJsonSetting('dataSource', '{{{{not valid');

    expect(mod.jsonError).toBe('Invalid JSON — change was not applied.');
    expect(mod.gridConfig.dataSource).toEqual([{ existing: true }]);
    expect(updateHook).toHaveBeenCalledTimes(1);
  });

  it('commits an empty array and clears jsonError when given an empty string', () => {
    mod.setSetting('dataSource', [{ existing: true }]);
    mod.commitJsonSetting('dataSource', '');
    expect(mod.gridConfig.dataSource).toEqual([]);
    expect(mod.jsonError).toBeNull();
  });

  it('treats a whitespace-only string as empty', () => {
    mod.commitJsonSetting('dataSource', '   \n  ');
    expect(mod.gridConfig.dataSource).toEqual([]);
    expect(mod.jsonError).toBeNull();
  });

  it('clears a prior jsonError once a subsequent commit succeeds', () => {
    mod.commitJsonSetting('dataSource', 'not json at all {{{');
    expect(mod.jsonError).not.toBeNull();
    mod.commitJsonSetting('dataSource', '[1]');
    expect(mod.jsonError).toBeNull();
  });
});

describe('triggerFetch', () => {
  it('increments fetchNonce by 1 each call', () => {
    expect(mod.fetchNonce).toBe(0);
    mod.triggerFetch();
    expect(mod.fetchNonce).toBe(1);
    mod.triggerFetch();
    expect(mod.fetchNonce).toBe(2);
  });

  it('calls notifyChange', () => {
    const rerenderHook = vi.fn();
    mod.setRerenderHook(rerenderHook);
    mod.triggerFetch();
    expect(rerenderHook).toHaveBeenCalledTimes(1);
  });
});

describe('getCustomProps', () => {
  it('returns a shallow copy of gridConfig, not a live reference', () => {
    const props1 = mod.getCustomProps();
    props1.gridConfig.showFilter = false;
    expect(mod.gridConfig.showFilter).toBe(true);
  });

  it('returns a fresh object reference on each call', () => {
    const props1 = mod.getCustomProps();
    const props2 = mod.getCustomProps();
    expect(props1).not.toBe(props2);
    expect(props1.gridConfig).not.toBe(props2.gridConfig);
  });

  it('reflects the current fetchNonce', () => {
    mod.triggerFetch();
    mod.triggerFetch();
    expect(mod.getCustomProps().fetchNonce).toBe(2);
  });

  it('exposes the row callback handlers', () => {
    const props = mod.getCustomProps();
    expect(typeof props.onRowAdd).toBe('function');
    expect(typeof props.onRowEdit).toBe('function');
    expect(typeof props.onRowDelete).toBe('function');
    expect(typeof props.onBatchSave).toBe('function');
  });
});

describe('row callback handlers', () => {
  it('onGridRowAdd logs the added row', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mod.onGridRowAdd({ id: 1 });
    expect(spy).toHaveBeenCalledWith('Added row:', { id: 1 });
  });

  it('onGridRowEdit logs the edited row', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mod.onGridRowEdit({ id: 1 });
    expect(spy).toHaveBeenCalledWith('Edit row:', { id: 1 });
  });

  it('onGridRowDelete logs the deleted row', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mod.onGridRowDelete({ id: 1 });
    expect(spy).toHaveBeenCalledWith('Deleted row:', { id: 1 });
  });

  it('onGridBatchSave logs the batch payload', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const payload = { added: [], updated: [] };
    mod.onGridBatchSave(payload);
    expect(spy).toHaveBeenCalledWith('Batch save:', payload);
  });
});

describe('static schema exports', () => {
  it('exposes the expected httpMethods list', () => {
    expect(mod.httpMethods).toContain('GET');
    expect(mod.httpMethods).toContain('DELETE');
  });

  it('exposes settingsGroups with the expected group titles', () => {
    const titles = mod.settingsGroups.map(g => g.title);
    expect(titles).toEqual(['Grid Mode', 'Appearance', 'Pagination', 'Toolbar Features']);
  });
});
