// src/app/agent-portal/services/agent-auth.service.ts

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface AgentUser {
  user_id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

export interface AgentProfile {
  agent_id: number;
  user_id: number;
  agent_code: string;          // e.g. AGT001
  referral_link: string;       // full URL
  is_active: boolean;
  created_at?: string;
}

export interface AgentAuthState {
  user: AgentUser | null;
  agent: AgentProfile | null;
  isAuthorized: boolean;
  isLoading: boolean;
  error: string | null;
}

const INITIAL: AgentAuthState = {
  user: null, agent: null,
  isAuthorized: false, isLoading: true, error: null,
};

@Injectable({ providedIn: 'root' })
export class AgentAuthService {
  private state$ = new BehaviorSubject<AgentAuthState>(INITIAL);
  readonly authState$ = this.state$.asObservable();

  get snapshot(): AgentAuthState { return this.state$.getValue(); }
  get agentCode(): string { return this.snapshot.agent?.agent_code ?? ''; }
  get referralLink(): string { return this.snapshot.agent?.referral_link ?? ''; }
  get userName(): string { return this.snapshot.user?.name ?? 'Agent'; }

  constructor(private api: ApiService, private router: Router) {}

  initialize(): Observable<AgentAuthState> {
    this.patch({ isLoading: true, error: null });

    return this.api.getCurrentUser().pipe(
      map((response: any) => {
        if (!response?.user) {
          const next = { ...INITIAL, isLoading: false, error: 'Not authenticated' };
          this.state$.next(next);
          return next;
        }

        const user: AgentUser = response.user;
        const role = (user.role ?? '').toLowerCase();
        // Admins can also access the agent portal for testing
        const isAuthorized = role === 'agent' || role === 'admin';
        // Agent profile is nested in the response from /users/userLoggedIn
        const agent: AgentProfile | null = response.agent ?? null;

        const next: AgentAuthState = {
          user, agent, isAuthorized, isLoading: false, error: null,
        };
        this.state$.next(next);
        return next;
      }),
      catchError(() => {
        const next = { ...INITIAL, isLoading: false, error: 'Failed to verify session.' };
        this.state$.next(next);
        return of(next);
      })
    );
  }

  redirectToLogin(): void {
    this.state$.next(INITIAL);
    this.router.navigate(['/agent/login']);
  }

  private patch(partial: Partial<AgentAuthState>): void {
    this.state$.next({ ...this.state$.getValue(), ...partial });
  }
}