import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { IColumn } from '../../../core/models/IColumn';
import { applyFilters, SortState } from '../store/data-grid.store';

export interface FilterChangeEvent {
  dataField: string;
  values: string[];
}

@Component({
  selector: 'rsivri-grid-hedaer',
  standalone: true,
  imports: [TitleCasePipe],
  templateUrl: './rsivri-grid-header.component.html',
  styleUrls: ['./rsivri-grid-header.component.css']
})
export class RsivriGridHeaderComponent {
  @Input() columns: IColumn[] = [];
  @Input() data: any[] = [];
  @Input() headerRowLines: boolean = true;
  @Input() headerColumnLines: boolean = true;
  @Input() bodyColumnLines: boolean = true;
  @Input() tableBorder: boolean = true;
  @Input() borderRadiusTop: boolean = true;
  @Input() showFilter: boolean = false;
  @Input() showSort: boolean = false;
  @Input() sort: SortState = { field: null, direction: null };

  @Output() filterChange = new EventEmitter<FilterChangeEvent>();
  @Output() sortToggle = new EventEmitter<string>();

  openDataField: string | null = null;
  selectedValues: Record<string, string[]> = {};

  getOptions(dataField: string): string[] {
    const otherFilters = { ...this.selectedValues };
    delete otherFilters[dataField];
    const rows = applyFilters(this.data, otherFilters);

    const values = new Set<string>();
    for (const row of rows) {
      const value = row?.[dataField];
      if (value !== undefined && value !== null && value !== '') {
        values.add(String(value));
      }
    }
    return Array.from(values).sort();
  }

  sortDirection(dataField: string): 'asc' | 'desc' | null {
    return this.sort.field === dataField ? this.sort.direction : null;
  }

  onSortClick(dataField: string, event: Event): void {
    event.stopPropagation();
    this.sortToggle.emit(dataField);
  }

  isOpen(dataField: string): boolean {
    return this.openDataField === dataField;
  }

  toggleDropdown(dataField: string, event: Event): void {
    event.stopPropagation();
    this.openDataField = this.isOpen(dataField) ? null : dataField;
  }

  isSelected(dataField: string, value: string): boolean {
    return (this.selectedValues[dataField] ?? []).includes(value);
  }

  selectedCount(dataField: string): number {
    return (this.selectedValues[dataField] ?? []).length;
  }

  toggleValue(dataField: string, value: string, event: Event): void {
    event.stopPropagation();
    const current = this.selectedValues[dataField] ?? [];
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    this.selectedValues = { ...this.selectedValues, [dataField]: next };
    this.filterChange.emit({ dataField, values: next });
  }

  clearFilter(dataField: string, event: Event): void {
    event.stopPropagation();
    this.selectedValues = { ...this.selectedValues, [dataField]: [] };
    this.filterChange.emit({ dataField, values: [] });
  }

  @HostListener('document:click')
  closeDropdown(): void {
    this.openDataField = null;
  }
}
