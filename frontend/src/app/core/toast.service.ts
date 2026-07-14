import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

export interface ConfirmRequest {
  id: number;
  title: string;
  message?: string;
  confirmText: string;
  cancelText: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

/**
 * App-wide, signal-backed notifications:
 *  - `success` / `error` / `info` push auto-dismissing toasts (rendered by
 *    <app-toast-host>, mounted once in App beside the router-outlet).
 *  - `confirm(...)` returns a Promise<boolean> and drives a themed dialog,
 *    replacing the native `confirm()` for destructive actions.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  readonly toasts = signal<Toast[]>([]);
  readonly confirmReq = signal<ConfirmRequest | null>(null);

  show(text: string, kind: ToastKind = 'info', durationMs = 3800): number {
    const id = ++this.seq;
    this.toasts.update((list) => [...list, { id, kind, text }]);
    if (durationMs > 0) setTimeout(() => this.dismiss(id), durationMs);
    return id;
  }

  success(text: string, durationMs?: number): number { return this.show(text, 'success', durationMs); }
  error(text: string, durationMs = 6000): number { return this.show(text, 'error', durationMs); }
  info(text: string, durationMs?: number): number { return this.show(text, 'info', durationMs); }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  /** Themed replacement for window.confirm — resolves true on confirm. */
  confirm(opts: {
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmReq.set({
        id: ++this.seq,
        title: opts.title,
        message: opts.message,
        confirmText: opts.confirmText ?? 'Confirm',
        cancelText: opts.cancelText ?? 'Cancel',
        danger: opts.danger ?? false,
        resolve,
      });
    });
  }

  resolveConfirm(ok: boolean): void {
    const req = this.confirmReq();
    if (!req) return;
    this.confirmReq.set(null);
    req.resolve(ok);
  }
}
