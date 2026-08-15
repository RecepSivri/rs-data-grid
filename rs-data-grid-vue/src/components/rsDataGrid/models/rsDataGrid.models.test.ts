import { describe, expect, it } from 'vitest';
import type { FilterChangeEvent, GridMode, IColumn, RemoteModeParams } from './rsDataGrid.models';

describe('rsDataGrid.models', () => {
  it('is a type-only module (compiles and type-checks with no runtime exports)', () => {
    const column: IColumn = { caption: 'Title', dataField: 'title' };
    const event: FilterChangeEvent = { dataField: 'title', values: ['a'] };
    const mode: GridMode = 'popup';
    const remote: RemoteModeParams = { endpoint: 'https://x', aliases: { data: 'items' } };
    expect(column.dataField).toBe('title');
    expect(event.values).toEqual(['a']);
    expect(mode).toBe('popup');
    expect(remote.aliases.data).toBe('items');
  });
});
