import { TestBed } from '@angular/core/testing';

import { AuthDraftService } from './auth-draft.service';

describe('AuthDraftService', () => {
  let service: AuthDraftService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthDraftService]
    });
    service = TestBed.inject(AuthDraftService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
