import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { map, switchMap } from 'rxjs';
import { CountryService } from 'src/core/services/country.service';
import { fetchData, setData } from './data-grid.actions';

@Injectable()
export class DataEffect {


  constructor(public actionParam: Actions, public service: CountryService) {

  }
 

  @Effect()
  navigateToDashboard$ = this.actionParam.pipe(
      ofType(fetchData),
      switchMap((action: any) => this.service.getCountries(action.url).pipe(
        map((values: any) => setData(action.remote ? 
          {data: action.section ? values[action.section] || [] : values || [], remote: action.remote, remoteDatasize: values[action.totalSection]} :
          {data: action.section ? values[action.section] || [] : values || [], remote: action.remote}
          ))
      )))

}
