import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import {RsivriGridComponent} from "./rsivri-grid/rsivri-grid.component";
import {RsivriGridHeaderComponent} from "./rsivri-grid/grid-header/rsivri-grid-header.component";
import {RsivriGridBodyComponent} from "./rsivri-grid/grid-body/rsivri-grid-body.component";
import {HttpClient, HttpClientModule} from "@angular/common/http";

@NgModule({
  declarations: [
    AppComponent,
    RsivriGridComponent,
    RsivriGridHeaderComponent,
    RsivriGridBodyComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
