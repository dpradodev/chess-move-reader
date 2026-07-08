import { Injectable, computed, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

export interface UserProfile {
  name: string;
  email: string;
}

const MOCK_DELAY_MS = 900;

/**
 * Mocked for now -- no real backend auth exists yet. Mirrors the Figma prototype's
 * fake ~900ms network delay (AuthScreen.handleSubmit in design/src/app/App.tsx) so
 * the loading state is real to build against. Swap the bodies for real HTTP calls
 * once apps/api grows a users/auth endpoint; the public shape (Observable<UserProfile>)
 * shouldn't need to change.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<UserProfile | null>(null);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  login(email: string, _password: string): Observable<UserProfile> {
    const profile: UserProfile = { name: 'Magnus C.', email };
    return of(profile).pipe(delay(MOCK_DELAY_MS), tap(u => this._user.set(u)));
  }

  register(name: string, email: string, _password: string): Observable<UserProfile> {
    const profile: UserProfile = { name: name.trim() || 'Magnus C.', email };
    return of(profile).pipe(delay(MOCK_DELAY_MS), tap(u => this._user.set(u)));
  }

  logout(): void {
    this._user.set(null);
  }
}
