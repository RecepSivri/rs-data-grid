import { useEffect, useState } from 'react';
import { IColumn, FilterChangeEvent } from '../models/rsDataGrid.models';
import { SortState, applyFilters } from '../store/dataGridStore';
import './rsDataGridHeader.scss';

export interface RsDataGridHeaderProps {
  columns: IColumn[];
  data: any[];
  headerRowLines: boolean;
  headerColumnLines: boolean;
  bodyColumnLines: boolean;
  tableBorder: boolean;
  borderRadiusTop: boolean;
  showFilter: boolean;
  showSort: boolean;
  showActions: boolean;
  showIndex: boolean;
  dragDropRows: boolean;
  dragDropColumns: boolean;
  sort: SortState;
  onFilterChange: (event: FilterChangeEvent) => void;
  onSortToggle: (dataField: string) => void;
  onColumnMove: (fromField: string, toField: string) => void;
}

const titleCase = (value: string): string =>
  value.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());

const DragHandleIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
    <circle cx="8" cy="7" r="1.8" />
    <circle cx="16" cy="7" r="1.8" />
    <circle cx="8" cy="17" r="1.8" />
    <circle cx="16" cy="17" r="1.8" />
  </svg>
);

export const RsDataGridHeader = ({
  columns,
  data,
  headerColumnLines,
  bodyColumnLines,
  tableBorder,
  borderRadiusTop,
  showFilter,
  showSort,
  showActions,
  showIndex,
  dragDropRows,
  dragDropColumns,
  sort,
  onFilterChange,
  onSortToggle,
  onColumnMove,
}: RsDataGridHeaderProps) => {
  const [openDataField, setOpenDataField] = useState<string | null>(null);
  const [selectedValues, setSelectedValues] = useState<Record<string, string[]>>({});
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [dragOverField, setDragOverField] = useState<string | null>(null);

  useEffect(() => {
    const closeDropdown = () => setOpenDataField(null);
    document.addEventListener('click', closeDropdown);
    return () => document.removeEventListener('click', closeDropdown);
  }, []);

  const getOptions = (dataField: string): string[] => {
    const otherFilters = { ...selectedValues };
    delete otherFilters[dataField];
    const rows = applyFilters(data, otherFilters);
    const values = new Set<string>();
    for (const row of rows) {
      const value = row?.[dataField];
      if (value !== undefined && value !== null && value !== '') {
        values.add(String(value));
      }
    }
    return Array.from(values).sort();
  };

  const sortDirection = (dataField: string): 'asc' | 'desc' | null => (sort.field === dataField ? sort.direction : null);

  const onSortClick = (dataField: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onSortToggle(dataField);
  };

  const isOpen = (dataField: string): boolean => openDataField === dataField;

  const toggleDropdown = (dataField: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenDataField(isOpen(dataField) ? null : dataField);
  };

  const isSelected = (dataField: string, value: string): boolean => (selectedValues[dataField] ?? []).includes(value);

  const selectedCount = (dataField: string): number => (selectedValues[dataField] ?? []).length;

  const toggleValue = (dataField: string, value: string, event: React.ChangeEvent) => {
    event.stopPropagation();
    const current = selectedValues[dataField] ?? [];
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    setSelectedValues({ ...selectedValues, [dataField]: next });
    onFilterChange({ dataField, values: next });
  };

  const clearFilter = (dataField: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedValues({ ...selectedValues, [dataField]: [] });
    onFilterChange({ dataField, values: [] });
  };

  return (
    <div>
      <div
        className={
          'full-row row-layout-space-between-center' +
          (tableBorder ? ' border-header' : '') +
          (borderRadiusTop ? ' border-area-small' : '')
        }
      >
        {dragDropRows && <div className={'drag-header-cell content-style row-layout-center-center' + (headerColumnLines ? ' border-right' : '')}></div>}
        {showIndex && <div className={'index-header-cell content-style row-layout-center-center' + (headerColumnLines ? ' border-right' : '')}>#</div>}
        {columns.map((column, i) => (
          <div
            key={column.dataField}
            className={
              'full-row content-style row-layout-center-center' +
              (headerColumnLines && (i < columns.length - 1 || showActions) ? ' border-right' : '') +
              (dragDropColumns && dragOverField === column.dataField ? ' column-drag-over' : '')
            }
            onDragOver={
              dragDropColumns
                ? event => {
                    event.preventDefault();
                    setDragOverField(column.dataField);
                  }
                : undefined
            }
            onDragLeave={dragDropColumns ? () => setDragOverField(field => (field === column.dataField ? null : field)) : undefined}
            onDrop={
              dragDropColumns
                ? event => {
                    event.preventDefault();
                    if (draggedField) {
                      onColumnMove(draggedField, column.dataField);
                    }
                    setDragOverField(null);
                    setDraggedField(null);
                  }
                : undefined
            }
          >
            {dragDropColumns && (
              <span
                className="drag-handle"
                draggable
                onDragStart={event => {
                  setDraggedField(column.dataField);
                  event.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => {
                  setDraggedField(null);
                  setDragOverField(null);
                }}
                aria-label={'Reorder ' + column.caption}
              >
                <DragHandleIcon />
              </span>
            )}
            <span className="header-caption">{titleCase(column.caption)}</span>
            {showSort && (
              <button
                type="button"
                className={'sort-toggle' + (sortDirection(column.dataField) !== null ? ' sort-toggle-active' : '')}
                aria-label={'Sort ' + column.caption}
                onClick={e => onSortClick(column.dataField, e)}
              >
                {sortDirection(column.dataField) === 'desc' && <span className="sort-icon sort-icon-active">&#9660;</span>}
                {sortDirection(column.dataField) === 'asc' && <span className="sort-icon sort-icon-active">&#9650;</span>}
                {sortDirection(column.dataField) === null && <span className="sort-icon">&#8645;</span>}
              </button>
            )}
          </div>
        ))}
        {showActions && <div className="actions-header-cell content-style row-layout-center-center">Actions</div>}
      </div>
      {showFilter && columns.length > 0 && (
        <div className={'full-row filter-row row-layout-space-between-center' + (tableBorder ? ' filter-row-border' : '')}>
          {dragDropRows && <div className={'drag-header-cell filter-cell row-layout-center-center' + (bodyColumnLines ? ' border-right' : '')}></div>}
          {showIndex && <div className={'index-header-cell filter-cell row-layout-center-center' + (bodyColumnLines ? ' border-right' : '')}></div>}
          {columns.map((column, i) => (
            <div
              key={column.dataField}
              className={
                'full-row filter-cell row-layout-center-center' +
                (bodyColumnLines && (i < columns.length - 1 || showActions) ? ' border-right' : '')
              }
            >
              <div className="filter-dropdown" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  className={
                    'filter-toggle' +
                    (selectedCount(column.dataField) > 0 ? ' filter-toggle-active' : '') +
                    (isOpen(column.dataField) ? ' filter-toggle-open' : '')
                  }
                  aria-label={'Filter ' + column.caption}
                  onClick={e => toggleDropdown(column.dataField, e)}
                >
                  <span className="filter-toggle-label">{titleCase(column.caption)}</span>
                  {selectedCount(column.dataField) > 0 && (
                    <span
                      className="filter-count"
                      title="Clear filter"
                      aria-label={'Clear filter for ' + column.caption}
                      onClick={e => clearFilter(column.dataField, e)}
                    >
                      {selectedCount(column.dataField)}
                    </span>
                  )}
                  <span className={'filter-caret' + (isOpen(column.dataField) ? ' filter-caret-open' : '')}>&#9662;</span>
                </button>
                {isOpen(column.dataField) && (
                  <div className="filter-panel">
                    {getOptions(column.dataField).length === 0 && <div className="filter-empty">No values</div>}
                    {getOptions(column.dataField).map(option => (
                      <label
                        key={option}
                        className={'filter-option' + (isSelected(column.dataField, option) ? ' filter-option-selected' : '')}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected(column.dataField, option)}
                          onChange={e => toggleValue(column.dataField, option, e)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                    {selectedCount(column.dataField) > 0 && (
                      <>
                        <div className="filter-panel-divider"></div>
                        <button type="button" className="filter-clear" onClick={e => clearFilter(column.dataField, e)}>
                          Clear selection
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {showActions && <div className="actions-header-cell filter-cell row-layout-center-center"></div>}
        </div>
      )}
    </div>
  );
};
