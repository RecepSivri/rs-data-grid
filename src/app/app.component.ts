import { AfterViewInit, Component, OnInit } from '@angular/core';
import { CountryService } from '../core/services/country.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements  OnInit, AfterViewInit{
  data: any[] = []
 constructor(private countryService: CountryService) {

 }

 ngOnInit(){
   this.getCountry();
 }

 getCountry = () => {
   this.countryService.getCountries().subscribe( (data: any) => {
     this.data = data;

   });
 }

  ngAfterViewInit(){
    console.log(this.data);
  }
}
