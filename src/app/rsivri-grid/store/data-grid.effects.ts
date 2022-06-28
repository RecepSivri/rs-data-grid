import { Injectable } from '@angular/core';
import { Actions, createEffect, Effect, ofType } from '@ngrx/effects';
import { map, mergeMap, of, switchMap } from 'rxjs';
import { CountryService } from 'src/core/services/country.service';
import { fetchData } from './data-grid.actions';

@Injectable()
export class DataEffect {


  constructor(public actionParam: Actions, public service: CountryService) {

  }


  @Effect()
  navigateToDashboard$ = this.actionParam.pipe(
      ofType(fetchData),
      switchMap(value => this.service.getCountries()))

}
