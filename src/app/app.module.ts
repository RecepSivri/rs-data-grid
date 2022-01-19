import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import {RsivriGridComponent} from "./rsivri-grid/rsivri-grid.component";

@NgModule({
  declarations: [
    AppComponent,
    RsivriGridComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
