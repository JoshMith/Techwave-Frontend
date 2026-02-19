// src/app/services/auth-draft.service.ts
//
// Persists login/signup form drafts to sessionStorage so users can
// navigate away and return without losing what they typed.
//
// — Password fields are intentionally EXCLUDED for security.
// — Data is stored per-form under distinct keys.
// — clearDraft() is called on successful submit or explicit sign-out.

import { Injectable } from '@angular/core';

export interface LoginDraft {
  email?: string;
}

export interface SignupDraft {
  name?: string;
  email?: string;
  phone?: string;
  newsletter?: boolean;
  // password / confirmPassword / terms intentionally omitted
}

const KEYS = {
  login:  'tw_draft_login',
  signup: 'tw_draft_signup',
} as const;

@Injectable({ providedIn: 'root' })
export class AuthDraftService {

  // ── Login ──────────────────────────────────────────

  saveLoginDraft(draft: LoginDraft): void {
    try {
      sessionStorage.setItem(KEYS.login, JSON.stringify(draft));
    } catch { /* sessionStorage unavailable (SSR / private mode) */ }
  }

  getLoginDraft(): LoginDraft | null {
    try {
      const raw = sessionStorage.getItem(KEYS.login);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  clearLoginDraft(): void {
    try { sessionStorage.removeItem(KEYS.login); } catch { /* noop */ }
  }

  // ── Signup ─────────────────────────────────────────

  saveSignupDraft(draft: SignupDraft): void {
    try {
      sessionStorage.setItem(KEYS.signup, JSON.stringify(draft));
    } catch { /* noop */ }
  }

  getSignupDraft(): SignupDraft | null {
    try {
      const raw = sessionStorage.getItem(KEYS.signup);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  clearSignupDraft(): void {
    try { sessionStorage.removeItem(KEYS.signup); } catch { /* noop */ }
  }
}