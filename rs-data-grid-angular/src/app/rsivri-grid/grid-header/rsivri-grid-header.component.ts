import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { IColumn } from '../../../core/models/IColumn';

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
  @Input() filtering: boolean = true;

  @Output() filterChange = new EventEmitter<FilterChangeEvent>();

  openDataField: string | null = null;
  selectedValues: Record<string, string[]> = {};

  getOptions(dataField: string): string[] {
    const values = new Set<string>();
    for (const row of this.data) {
      const value = row?.[dataField];
      if (value !== undefined && value !== null && value !== '') {
        values.add(String(value));
      }
    }
    return Array.from(values).sort();
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
