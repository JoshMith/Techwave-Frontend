import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AgentPortalComponent } from './agent-portal.component';

describe('AgentPortalComponent', () => {
  let component: AgentPortalComponent;
  let fixture: ComponentFixture<AgentPortalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AgentPortalComponent,
        HttpClientTestingModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AgentPortalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});