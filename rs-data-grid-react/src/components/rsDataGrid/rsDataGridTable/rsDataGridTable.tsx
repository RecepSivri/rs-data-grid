import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { IColumn, GridMode } from '../models/rsDataGrid.models';
import './rsDataGridTable.scss';

export interface RsDataGridTableProps {
  columns: IColumn[];
  data: any[];
  bodyRowLines: boolean;
  bodyColumnLines: boolean;
  tableBorder: boolean;
  borderRadiusBottom: boolean;
  diagonalRow: boolean;
  showActions: boolean;
  showIndex: boolean;
  dragDropRows: boolean;
  indexOffset: number;
  gridMode: GridMode;
  onRowEdit: (row: any) => void;
  onRowDelete: (row: any) => void;
  onRowMove: (fromRow: any, toRow: any) => void;
  onBatchRowSave: (payload: { original: any; updated: any }) => void;
  onBatchRowAdd: (row: any) => void;
  onBatchCommit: (payload: { added: any[]; updated: { original: any; updated: any }[] }) => void;
  onRequestConfirm: (title: string, message: string) => Promise<boolean>;
}

export interface RsDataGridTableHandle {
  startAddingRow: () => void;
  addBatchRow: () => void;
  saveBatch: () => void;
}

const IMAGE_URL_PATTERN = /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i;

const isImageUrl = (value: unknown): value is string => typeof value === 'string' && IMAGE_URL_PATTERN.test(value);

const SaveIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <path d="M17 21v-8H7v8" />
    <path d="M7 3v5h8" />
  </svg>
);

const CancelIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="M6 6l12 12" />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const DeleteIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
);

const DragHandleIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
    <circle cx="8" cy="7" r="1.8" />
    <circle cx="16" cy="7" r="1.8" />
    <circle cx="8" cy="17" r="1.8" />
    <circle cx="16" cy="17" r="1.8" />
  </svg>
);

export const RsDataGridTable = forwardRef<RsDataGridTableHandle, RsDataGridTableProps>((props, ref) => {
  const {
    columns,
    data,
    bodyRowLines,
    bodyColumnLines,
    tableBorder,
    borderRadiusBottom,
    diagonalRow,
    showActions,
    showIndex,
    dragDropRows,
    indexOffset,
    gridMode,
    onRowEdit,
    onRowDelete,
    onRowMove,
    onBatchRowSave,
    onBatchRowAdd,
    onBatchCommit,
    onRequestConfirm,
  } = props;

  const [editingRow, setEditingRow] = useState<any>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [addDraft, setAddDraft] = useState<Record<string, string>>({});
  const [draggedRow, setDraggedRow] = useState<any>(null);
  const [dragOverRow, setDragOverRow] = useState<any>(null);

  const toDraft = (row: any): Record<string, string> => {
    const draft: Record<string, string> = {};
    for (const column of columns) {
      const value = row[column.dataField];
      draft[column.dataField] = value === null || value === undefined ? '' : String(value);
    }
    return draft;
  };

  const [batchDrafts, setBatchDrafts] = useState<Record<string, string>[]>([]);
  const [batchNewDrafts, setBatchNewDrafts] = useState<Record<string, string>[]>([]);
  const batchDraftRowRefsRef = useRef<any[]>([]);

  useEffect(() => {
    if (gridMode !== 'batch') {
      return;
    }
    const draftByRow = new Map<any, Record<string, string>>();
    batchDraftRowRefsRef.current.forEach((row, i) => {
      const existing = batchDrafts[i];
      if (existing) {
        draftByRow.set(row, existing);
      }
    });
    setBatchDrafts(data.map(row => draftByRow.get(row) ?? toDraft(row)));
    batchDraftRowRefsRef.current = data;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, gridMode, columns]);

  const updateBatchDraft = (i: number, field: string, value: string) => {
    setBatchDrafts(prev => prev.map((draft, idx) => (idx === i ? { ...draft, [field]: value } : draft)));
  };

  const updateBatchNewDraft = (i: number, field: string, value: string) => {
    setBatchNewDrafts(prev => prev.map((draft, idx) => (idx === i ? { ...draft, [field]: value } : draft)));
  };

  const removeBatchNewRow = (index: number) => {
    setBatchNewDrafts(prev => prev.filter((_, i) => i !== index));
  };

  const saveBatch = () => {
    const updated: { original: any; updated: any }[] = [];
    data.forEach((row, i) => {
      const draft = batchDrafts[i];
      if (!draft) {
        return;
      }
      const isDirty = columns.some(column => String(row[column.dataField] ?? '') !== draft[column.dataField]);
      if (isDirty) {
        updated.push({ original: row, updated: { ...row, ...draft } });
      }
    });
    const added = batchNewDrafts.map(draft => ({ ...draft }));
    setBatchNewDrafts([]);
    onBatchCommit({ added, updated });
  };

  useImperativeHandle(ref, () => ({
    startAddingRow: () => {
      setIsAddingRow(true);
      const draft: Record<string, string> = {};
      for (const column of columns) {
        draft[column.dataField] = '';
      }
      setAddDraft(draft);
    },
    addBatchRow: () => {
      setBatchNewDrafts(prev => [...prev, toDraft({})]);
    },
    saveBatch,
  }));

  const startEditingRow = (row: any) => {
    setEditingRow(row);
    const draft: Record<string, string> = {};
    for (const column of columns) {
      const value = row[column.dataField];
      draft[column.dataField] = value === null || value === undefined ? '' : String(value);
    }
    setEditDraft(draft);
  };

  const onEditClick = (row: any, event: React.MouseEvent) => {
    event.stopPropagation();
    if (gridMode === 'row') {
      startEditingRow(row);
    } else {
      onRowEdit(row);
    }
  };

  const onSaveEditClick = async () => {
    const confirmed = await onRequestConfirm('Confirm save', 'Are you sure you want to save the changes to this row?');
    if (confirmed) {
      const updated = { ...editingRow, ...editDraft };
      onBatchRowSave({ original: editingRow, updated });
      setEditingRow(null);
    }
  };

  const onCancelEditClick = () => setEditingRow(null);

  const onSaveAddClick = async () => {
    const confirmed = await onRequestConfirm('Confirm add', 'Are you sure you want to add this row?');
    if (confirmed) {
      onBatchRowAdd({ ...addDraft });
      setIsAddingRow(false);
    }
  };

  const onCancelAddClick = () => setIsAddingRow(false);

  const cellClass = (j: number) =>
    'full-row section-style row-layout-center-center' + (bodyColumnLines && (j < columns.length - 1 || showActions) ? ' border-right' : '');

  const indexCellClass = 'index-cell section-style row-layout-center-center' + (bodyColumnLines ? ' border-right' : '');
  const dragCellClass = 'drag-cell section-style row-layout-center-center' + (bodyColumnLines ? ' border-right' : '');

  return (
    <div className="column-layout full-row">
      {isAddingRow && (
        <div className={'full-row' + (tableBorder ? ' row-style' : '') + ' row-style-bottom'}>
          <div className="full-row row-layout">
            {dragDropRows && <div className={dragCellClass}></div>}
            {showIndex && <div className={indexCellClass}></div>}
            {columns.map((column, j) => (
              <div key={column.dataField} className={cellClass(j)}>
                <input
                  type="text"
                  className="inline-edit-input"
                  value={addDraft[column.dataField] ?? ''}
                  onChange={e => setAddDraft({ ...addDraft, [column.dataField]: e.target.value })}
                />
              </div>
            ))}
            {showActions && (
              <div className="actions-cell row-layout-center-center">
                <button type="button" className="row-action-button row-action-save" title="Save row" aria-label="Save row" onClick={onSaveAddClick}>
                  <SaveIcon />
                </button>
                <button type="button" className="row-action-button" title="Cancel" aria-label="Cancel" onClick={onCancelAddClick}>
                  <CancelIcon />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {data.map((item, i) => {
        const isEditingThis = item === editingRow;
        const rowClass =
          'full-row' +
          (tableBorder ? ' row-style' : '') +
          ((tableBorder && i === data.length - 1) || (bodyRowLines && i !== data.length - 1) ? ' row-style-bottom' : '') +
          (borderRadiusBottom && i === data.length - 1 ? ' border-area-small' : '') +
          (i % 2 === 1 && diagonalRow ? ' row-background' : '') +
          (draggedRow === item ? ' row-dragging' : '') +
          (dragDropRows && dragOverRow === item ? ' row-drag-over' : '');
        return (
          <div
            key={i}
            className={rowClass}
            onDragOver={
              dragDropRows
                ? event => {
                    event.preventDefault();
                    setDragOverRow(item);
                  }
                : undefined
            }
            onDragLeave={dragDropRows ? () => setDragOverRow((row: any) => (row === item ? null : row)) : undefined}
            onDrop={
              dragDropRows
                ? event => {
                    event.preventDefault();
                    if (draggedRow) {
                      onRowMove(draggedRow, item);
                    }
                    setDragOverRow(null);
                    setDraggedRow(null);
                  }
                : undefined
            }
          >
            <div className="full-row row-layout">
              {dragDropRows && (
                <div className={dragCellClass}>
                  <span
                    className="drag-handle"
                    draggable
                    onDragStart={event => {
                      setDraggedRow(item);
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => {
                      setDraggedRow(null);
                      setDragOverRow(null);
                    }}
                    aria-label="Reorder row"
                  >
                    <DragHandleIcon />
                  </span>
                </div>
              )}
              {showIndex && <div className={indexCellClass}>{indexOffset + i + 1}</div>}
              {gridMode === 'batch' ? (
                <>
                  {columns.map((column, j) => (
                    <div key={column.dataField} className={cellClass(j)}>
                      <input
                        type="text"
                        className="inline-edit-input"
                        value={batchDrafts[i]?.[column.dataField] ?? ''}
                        onChange={e => updateBatchDraft(i, column.dataField, e.target.value)}
                      />
                    </div>
                  ))}
                  {showActions && (
                    <div className="actions-cell row-layout-center-center">
                      <button type="button" className="row-action-button row-action-delete" title="Delete row" aria-label="Delete row" onClick={() => onRowDelete(item)}>
                        <DeleteIcon />
                      </button>
                    </div>
                  )}
                </>
              ) : isEditingThis ? (
                <>
                  {columns.map((column, j) => (
                    <div key={column.dataField} className={cellClass(j)}>
                      <input
                        type="text"
                        className="inline-edit-input"
                        value={editDraft[column.dataField] ?? ''}
                        onChange={e => setEditDraft({ ...editDraft, [column.dataField]: e.target.value })}
                      />
                    </div>
                  ))}
                  {showActions && (
                    <div className="actions-cell row-layout-center-center">
                      <button type="button" className="row-action-button row-action-save" title="Save row" aria-label="Save row" onClick={onSaveEditClick}>
                        <SaveIcon />
                      </button>
                      <button type="button" className="row-action-button" title="Cancel" aria-label="Cancel" onClick={onCancelEditClick}>
                        <CancelIcon />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {columns.map((column, j) => (
                    <div key={column.dataField} className={cellClass(j)}>
                      {isImageUrl(item[column.dataField]) ? (
                        <img className="cell-thumbnail" src={item[column.dataField]} alt="" />
                      ) : (
                        item[column.dataField]
                      )}
                    </div>
                  ))}
                  {showActions && (
                    <div className="actions-cell row-layout-center-center">
                      <button type="button" className="row-action-button" title="Edit row" aria-label="Edit row" onClick={e => onEditClick(item, e)}>
                        <EditIcon />
                      </button>
                      <button type="button" className="row-action-button row-action-delete" title="Delete row" aria-label="Delete row" onClick={() => onRowDelete(item)}>
                        <DeleteIcon />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
      {gridMode === 'batch' &&
        batchNewDrafts.map((draft, i) => (
          <div key={'new-' + i} className={'full-row' + (tableBorder ? ' row-style' : '') + ' row-style-bottom'}>
            <div className="full-row row-layout">
              {dragDropRows && <div className={dragCellClass}></div>}
              {showIndex && <div className={indexCellClass}></div>}
              {columns.map((column, j) => (
                <div key={column.dataField} className={cellClass(j)}>
                  <input
                    type="text"
                    className="inline-edit-input"
                    value={draft[column.dataField] ?? ''}
                    onChange={e => updateBatchNewDraft(i, column.dataField, e.target.value)}
                  />
                </div>
              ))}
              {showActions && (
                <div className="actions-cell row-layout-center-center">
                  <button type="button" className="row-action-button row-action-delete" title="Remove row" aria-label="Remove row" onClick={() => removeBatchNewRow(i)}>
                    <DeleteIcon />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
    </div>
  );
});
