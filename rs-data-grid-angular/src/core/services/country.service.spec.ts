import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { CountryService } from './country.service';


describe('CountryService', () => {
  let service: CountryService | any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule
      ]
    });
    service = TestBed.inject(CountryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call service getCountries', () => {
    spyOn(service, "getCountries").and.returnValue(of({}));
    expect(service.getCountries).toHaveBeenCalled();
  });

});
