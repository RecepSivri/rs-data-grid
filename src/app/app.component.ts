import {Component, OnInit} from '@angular/core';
import {CountryService} from "../core/services/country.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements  OnInit{
  data: any[] = []
 constructor(private countryService: CountryService) {

 }

 ngOnInit(){
   this.getCountry()
 }

 getCountry = () => {
   this.countryService.getCountries().subscribe( (data: any) => {
     this.data = data.map((item: any) => {
       return {name: item.name, region: item.region}
     });
     this.data = this.data.slice(1, 3 + 1);
   })
 }

 val = (v: any) => {
    console.log(v)

   return v.length > 0 ? v : [{name: 'recep'}];
 }
}
