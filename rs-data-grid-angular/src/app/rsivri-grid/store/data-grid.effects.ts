import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, switchMap } from 'rxjs';
import { CountryService } from '../../../core/services/country.service';
import { fetchData, setData } from './data-grid.actions';

@Injectable()
export class DataEffect {
  constructor(
    private actions$: Actions,
    private service: CountryService
  ) {}

  fetchData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(fetchData),
      switchMap((action) =>
        this.service.getCountries(action.url).pipe(
          map((values: any) =>
            setData(
              action.remote
                ? {
                    data: action.section ? values[action.section] || [] : values || [],
                    remote: action.remote,
                    remoteDatasize: values[action.totalSection as string]
                  }
                : {
                    data: action.section ? values[action.section] || [] : values || [],
                    remote: action.remote
                  }
            )
          )
        )
      )
    )
  );
}
