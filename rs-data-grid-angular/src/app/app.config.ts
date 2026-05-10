import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { dataGridReducer } from './rsivri-grid/store/data-grid.reducer';
import { DataEffect } from './rsivri-grid/store/data-grid.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    provideStore({ dataGrid: dataGridReducer }),
    provideEffects([DataEffect]),
    provideStoreDevtools({ maxAge: 25 }),
  ]
};
