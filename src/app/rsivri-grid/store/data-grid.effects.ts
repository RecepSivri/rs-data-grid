import { Injectable } from '@angular/core';
import { Actions, createEffect, Effect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap, of, switchMap } from 'rxjs';
import { CountryService } from 'src/core/services/country.service';
import { fetchData, increasePageNum, setData } from './data-grid.actions';

@Injectable()
export class DataEffect {


  constructor(public actionParam: Actions, public service: CountryService) {

  }
 

  @Effect()
  navigateToDashboard$ = this.actionParam.pipe(
      ofType(fetchData),
      switchMap((action: any) => this.service.getCountries(action.url).pipe(
        map((values: any) => setData({data: action.section ? values[action.section] || [] : values || []}))
      )))

}
