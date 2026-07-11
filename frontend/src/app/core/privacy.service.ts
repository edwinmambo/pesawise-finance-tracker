import { ApplicationRef, Injectable, inject, signal } from '@angular/core';

const KEY = 'pesawise_hide_balances';

/**
 * Privacy toggle for monetary values. Balances are HIDDEN BY DEFAULT; an eye
 * icon reveals them. State persists across sessions.
 */
@Injectable({ providedIn: 'root' })
export class PrivacyService {
  private appRef = inject(ApplicationRef);
  readonly hidden = signal<boolean>(this.initial());

  toggle(): void {
    this.set(!this.hidden());
  }

  set(hidden: boolean): void {
    this.hidden.set(hidden);
    localStorage.setItem(KEY, hidden ? '1' : '0');
    // Money is rendered through an impure pipe; force every view to refresh.
    this.appRef.tick();
  }

  private initial(): boolean {
    const saved = localStorage.getItem(KEY);
    return saved === null ? true : saved === '1';
  }
}
