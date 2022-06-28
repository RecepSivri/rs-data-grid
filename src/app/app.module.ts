import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import {RsivriGridComponent} from "./rsivri-grid/rsivri-grid.component";
import {RsivriGridHeaderComponent} from "./rsivri-grid/grid-header/rsivri-grid-header.component";
import {RsivriGridBodyComponent} from "./rsivri-grid/grid-body/rsivri-grid-body.component";
import {HttpClientModule} from "@angular/common/http";
import {RsivriGridPagerComponent} from './rsivri-grid/grid-pager/rsivri-grid-pager.component';
import { EffectsModule } from '@ngrx/effects';
import { DataEffect } from './rsivri-grid/store/data-grid.effects';
import { StoreModule } from '@ngrx/store';
import { dataGridReducer } from './rsivri-grid/store/data-grid.reducer';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { environment } from '../environments/environment.prod';

@NgModule({
  declarations: [
    AppComponent,
    RsivriGridComponent,
    RsivriGridHeaderComponent,
    RsivriGridBodyComponent,
    RsivriGridPagerComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    EffectsModule.forRoot([DataEffect]),
    StoreModule.forRoot({ reducer: dataGridReducer }),
    StoreDevtoolsModule.instrument({
      maxAge: 25, // Retains last 25 states
      logOnly: environment.production, // Restrict extension to log-only mode
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
