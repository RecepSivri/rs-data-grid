export interface IColumn {
  caption: string;
  dataField: string;
}

export interface FilterChangeEvent {
  dataField: string;
  values: string[];
}

export type GridMode = 'popup' | 'batch';

export interface RemoteModeParams {
  endpoint: string;
  aliases: { data: string };
}
