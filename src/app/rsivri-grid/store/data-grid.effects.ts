import { Injectable } from '@angular/core';
import { Actions, createEffect, Effect, ofType } from '@ngrx/effects';
import { map, mergeMap, of, switchMap } from 'rxjs';
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
        map(values => setData({data: values}))
      )))

}
