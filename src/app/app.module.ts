import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import {RsivriGridComponent} from "./rsivri-grid/rsivri-grid.component";
import {RsivriGridHeaderComponent} from "./rsivri-grid/grid-header/rsivri-grid-header.component";
import {RsivriGridBodyComponent} from "./rsivri-grid/grid-body/rsivri-grid-body.component";
import {HttpClientModule} from "@angular/common/http";
import {RsivriGridPagerComponent} from './rsivri-grid/grid-pager/rsivri-grid-pager.component';

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
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
