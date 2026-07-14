import { inject, Injectable, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { AppNotification } from './models';

/**
 * Holds the in-app notification list + unread count for the header bell.
 * Loads on login and refreshes periodically; the backend derives notifications
 * from current state (budget overruns, loans due, goals reached).
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  readonly items = signal<AppNotification[]>([]);
  readonly unread = computed(() => this.items().filter((n) => !n.read).length);

  constructor() {
    // Poll while authenticated (also runs once immediately).
    this.refresh();
    setInterval(() => this.refresh(), 90_000);
  }

  refresh(): void {
    if (!this.auth.user()) return;
    this.api.notifications().subscribe({
      next: (list) => this.items.set(list),
      error: () => {/* silent — bell just shows nothing */},
    });
  }

  markRead(n: AppNotification): void {
    if (n.read) return;
    this.items.update((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    this.api.markNotificationRead(n.id).subscribe({ error: () => this.refresh() });
  }

  markAllRead(): void {
    if (!this.unread()) return;
    this.items.update((list) => list.map((x) => ({ ...x, read: true })));
    this.api.markAllNotificationsRead().subscribe({ error: () => this.refresh() });
  }
}
