import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { of } from 'rxjs';
import { DataEffect } from './data-grid.effects';
import { CountryService } from '../../../core/services/country.service';
import { fetchData, setData } from './data-grid.actions';

describe('DataEffect', () => {
  let actions$: any;
  let effects: DataEffect;
  let countryServiceSpy: jasmine.SpyObj<CountryService>;

  beforeEach(() => {
    countryServiceSpy = jasmine.createSpyObj('CountryService', ['getCountries']);
    TestBed.configureTestingModule({
      providers: [
        DataEffect,
        provideMockActions(() => actions$),
        { provide: CountryService, useValue: countryServiceSpy }
      ]
    });
    effects = TestBed.inject(DataEffect);
  });

  function runEffect(action: any, response: any): any {
    countryServiceSpy.getCountries.and.returnValue(of(response));
    actions$ = of(action);
    let result: any;
    effects.fetchData$.subscribe(r => (result = r));
    return result;
  }

  it('requests data from the given url', () => {
    runEffect(fetchData({ url: 'http://api.test/x', section: undefined, remote: false }), []);
    expect(countryServiceSpy.getCountries).toHaveBeenCalledWith('http://api.test/x');
  });

  describe('remote mode', () => {
    it('extracts the section and total size when both are present', () => {
      const result = runEffect(
        fetchData({ url: 'u', section: 'items', remote: true, totalSection: 'size' }),
        { items: [{ name: 'x' }], size: 5 }
      );
      expect(result).toEqual(setData({ data: [{ name: 'x' }], remote: true, remoteDatasize: 5 }));
    });

    it('falls back to an empty array when the requested section is missing', () => {
      const result = runEffect(
        fetchData({ url: 'u', section: 'items', remote: true, totalSection: 'size' }),
        { size: 5 }
      );
      expect(result).toEqual(setData({ data: [], remote: true, remoteDatasize: 5 }));
    });

    it('uses the response directly when no section is given', () => {
      const response = [{ name: 'y' }];
      const result = runEffect(
        fetchData({ url: 'u', section: undefined, remote: true, totalSection: 'size' }),
        response
      );
      expect(result).toEqual(setData({ data: response, remote: true, remoteDatasize: undefined }));
    });

    it('falls back to an empty array when no section is given and the response is empty', () => {
      const result = runEffect(
        fetchData({ url: 'u', section: undefined, remote: true, totalSection: 'size' }),
        ''
      );
      expect(result).toEqual(setData({ data: [], remote: true, remoteDatasize: undefined }));
    });
  });

  describe('local mode', () => {
    it('extracts the section when present', () => {
      const result = runEffect(
        fetchData({ url: 'u', section: 'items', remote: false }),
        { items: [{ a: 1 }] }
      );
      expect(result).toEqual(setData({ data: [{ a: 1 }], remote: false }));
    });

    it('falls back to an empty array when the requested section is missing', () => {
      const result = runEffect(
        fetchData({ url: 'u', section: 'items', remote: false }),
        {}
      );
      expect(result).toEqual(setData({ data: [], remote: false }));
    });

    it('uses the response directly when no section is given', () => {
      const response = [{ a: 1 }];
      const result = runEffect(
        fetchData({ url: 'u', section: undefined, remote: false }),
        response
      );
      expect(result).toEqual(setData({ data: response, remote: false }));
    });

    it('falls back to an empty array when no section is given and the response is empty', () => {
      const result = runEffect(
        fetchData({ url: 'u', section: undefined, remote: false }),
        ''
      );
      expect(result).toEqual(setData({ data: [], remote: false }));
    });
  });
});
