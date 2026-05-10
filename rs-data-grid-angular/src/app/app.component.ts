import { Component } from '@angular/core';
import { RsivriGridComponent } from './rsivri-grid/rsivri-grid.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RsivriGridComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {}
