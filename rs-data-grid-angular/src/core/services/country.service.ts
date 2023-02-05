import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";

@Injectable({
  providedIn: 'root',
})
export class CountryService {

  constructor(private http: HttpClient) { }


  getCountries(url: string) {
    return this.http.get(url);
  }
}
