import { Component, inject } from '@angular/core';
import { ToastService, ToastKind } from '../core/toast.service';

/**
 * Single global host for toasts + the confirm dialog. Mounted once in App,
 * beside <router-outlet>, so it survives route changes and overlays everything
 * (z-index above the .overlay modal layer).
 */
@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="true">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class.ok]="t.kind === 'success'" [class.err]="t.kind === 'error'" [class.info]="t.kind === 'info'" role="status">
          <i class="ic bi" [class]="icon(t.kind)"></i>
          <span class="msg">{{ t.text }}</span>
          <button class="x" (click)="toast.dismiss(t.id)" aria-label="Dismiss"><i class="bi bi-x"></i></button>
        </div>
      }
    </div>

    @if (toast.confirmReq(); as c) {
      <div class="overlay" (click)="toast.resolveConfirm(false)">
        <div class="modal confirm" (click)="$event.stopPropagation()">
          <div class="modal-body">
            <h3>{{ c.title }}</h3>
            @if (c.message) { <p class="muted" style="margin:8px 0 0;font-size:13.5px">{{ c.message }}</p> }
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="toast.resolveConfirm(false)">{{ c.cancelText }}</button>
            <button class="btn" [class.danger]="c.danger" (click)="toast.resolveConfirm(true)">{{ c.confirmText }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .toast-stack {
      position: fixed; top: 16px; right: 16px; z-index: 1200;
      display: flex; flex-direction: column; gap: 10px;
      max-width: min(360px, calc(100vw - 32px)); pointer-events: none;
    }
    .toast {
      pointer-events: auto; display: flex; align-items: center; gap: 10px;
      padding: 12px 14px; border-radius: 12px; background: var(--surface);
      border: 1px solid var(--border-2); border-left: 3px solid var(--muted);
      box-shadow: var(--shadow-lg); font-size: 13.5px; font-weight: 560; color: var(--ink);
      animation: toastIn .2s ease;
    }
    .toast .ic { font-size: 16px; display: flex; }
    .toast .msg { flex: 1; }
    .toast .x { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 17px; line-height: 1; padding: 0 2px; display: flex; }
    .toast.ok  { border-left-color: var(--income); }  .toast.ok .ic  { color: var(--income); }
    .toast.err { border-left-color: var(--expense); } .toast.err .ic { color: var(--expense); }
    .toast.info { border-left-color: var(--brand); }  .toast.info .ic { color: var(--brand); }
    @keyframes toastIn { from { opacity: 0; transform: translateX(12px); } }
    .modal.confirm { max-width: 400px; }
    .modal.confirm h3 { font-size: 17px; }
    .modal.confirm .btn.danger { background: var(--critical); border-color: var(--critical); color: #fff; }
    .modal.confirm .btn.danger:hover { filter: brightness(.94); }
    @media (max-width: 640px) {
      .toast-stack { top: auto; bottom: 16px; left: 16px; right: 16px; max-width: none; }
    }
  `],
})
export class ToastHostComponent {
  toast = inject(ToastService);

  icon(kind: ToastKind): string {
    return kind === 'success' ? 'bi-check-circle-fill'
      : kind === 'error' ? 'bi-exclamation-triangle-fill'
      : 'bi-info-circle-fill';
  }
}
