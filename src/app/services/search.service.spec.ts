import { TestBed } from '@angular/core/testing';

import { SearchService } from './search.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SearchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
