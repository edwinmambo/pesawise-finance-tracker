import { Injectable, signal } from '@angular/core';

export type WeekStart = 'mon' | 'sun';
const KEY = 'pesawise_week_start';

/** Small display preferences persisted locally. */
@Injectable({ providedIn: 'root' })
export class PrefsService {
  readonly weekStart = signal<WeekStart>(this.initial());

  setWeekStart(w: WeekStart): void {
    this.weekStart.set(w);
    localStorage.setItem(KEY, w);
  }

  private initial(): WeekStart {
    return localStorage.getItem(KEY) === 'sun' ? 'sun' : 'mon';
  }
}
