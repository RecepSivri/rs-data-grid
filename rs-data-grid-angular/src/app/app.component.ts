import { AfterViewInit, Component, OnInit } from '@angular/core';
import { CountryService } from '../core/services/country.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  data: any[] = [];
  constructor(private countryService: CountryService) {}

  ngOnInit() {}
}
