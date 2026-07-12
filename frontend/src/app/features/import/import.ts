import { Component, computed, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { ImportPreview, ImportSource } from '../../core/models';
import { KesPipe } from '../../core/kes.pipe';

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [KesPipe],
  template: `
    <div class="page-actions">
      <div><h2 class="section-title">Import from M-Pesa</h2><div class="muted">Paste M-Pesa SMS messages (or a statement CSV) — we'll extract the transactions.</div></div>
    </div>

    <div class="card">
      <div class="card-pad">
        <div class="row wrap gap-8" style="margin-bottom:12px">
          <button class="chip" [class.active]="source() === 'MPESA_SMS'" (click)="source.set('MPESA_SMS')">📱 SMS paste</button>
          <button class="chip" [class.active]="source() === 'MPESA_CSV'" (click)="source.set('MPESA_CSV')">📄 Statement CSV</button>
        </div>
        <textarea
          class="input mono"
          rows="8"
          [placeholder]="source() === 'MPESA_SMS' ? examplePlaceholder : 'Paste the contents of your M-Pesa statement CSV…'"
          [value]="raw()"
          (input)="raw.set($any($event.target).value)"></textarea>
        <div class="row gap-8" style="margin-top:12px">
          <button class="btn primary" (click)="preview()" [disabled]="!raw().trim() || loading()">
            {{ loading() ? 'Reading…' : 'Preview' }}
          </button>
          @if (result()) { <button class="btn ghost" (click)="reset()">Clear</button> }
        </div>
      </div>
    </div>

    @if (result(); as r) {
      <div class="card mt-24">
        <div class="card-head">
          <div><h3>Preview</h3><div class="sub">{{ summary() }}</div></div>
          @if (newCount() > 0 && !committedMsg()) {
            <button class="btn primary" (click)="commit()" [disabled]="committing()">
              {{ committing() ? 'Importing…' : 'Import ' + newCount() + ' transaction' + (newCount() === 1 ? '' : 's') }}
            </button>
          }
        </div>
        <div class="card-pad">
          @if (committedMsg()) { <div class="banner ok">✅ {{ committedMsg() }}</div> }

          @if (r.batch.rows.length) {
            <div class="table-wrap">
              <table class="tbl">
                <thead><tr><th>Date</th><th>Details</th><th>Ref</th><th class="r">Amount</th><th>Status</th></tr></thead>
                <tbody>
                  @for (row of r.batch.rows; track row.id) {
                    <tr [class.dim]="row.status !== 'NEW'">
                      <td class="tabnum">{{ row.date }}</td>
                      <td>{{ row.note || '—' }}</td>
                      <td class="mono small">{{ row.reference || '—' }}</td>
                      <td class="r tabnum" [class.pos]="row.type === 'INCOME'" [class.neg]="row.type === 'EXPENSE'">
                        {{ row.type === 'INCOME' ? '+' : '−' }}{{ row.amount | kes }}
                      </td>
                      <td><span class="badge" [class]="row.status.toLowerCase()">{{ row.status }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else { <div class="empty">Nothing recognisable was found in that text.</div> }

          @if (r.unparsed.length) {
            <details class="unparsed">
              <summary>{{ r.unparsed.length }} line(s) couldn't be parsed</summary>
              @for (u of r.unparsed; track $index) { <div class="mono small muted">{{ u }}</div> }
            </details>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .input { width: 100%; padding: 12px 14px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface-2, var(--surface)); color: var(--ink); resize: vertical; }
    .mono { font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: 12.5px; }
    .small { font-size: 12px; }
    .table-wrap { overflow-x: auto; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    .tbl th, .tbl td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--line); }
    .tbl th.r, .tbl td.r { text-align: right; }
    .tbl tr.dim { opacity: .5; }
    .badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--line); }
    .badge.new { color: var(--income); border-color: color-mix(in srgb, var(--income) 40%, transparent); }
    .badge.duplicate { color: var(--ink-2); }
    .badge.committed { color: var(--brand); }
    .banner.ok { background: color-mix(in srgb, var(--income) 12%, transparent); color: var(--income); padding: 10px 14px; border-radius: 10px; margin-bottom: 12px; }
    .unparsed { margin-top: 14px; }
    .unparsed summary { cursor: pointer; color: var(--ink-2); font-size: 13px; }
  `],
})
export class ImportComponent {
  private api = inject(ApiService);

  source = signal<ImportSource>('MPESA_SMS');
  raw = signal('');
  loading = signal(false);
  committing = signal(false);
  result = signal<ImportPreview | null>(null);
  committedMsg = signal<string | null>(null);

  examplePlaceholder =
    'SLK4TX9QAZ Confirmed. Ksh1,500.00 sent to JOHN DOE 0712345678 on 5/1/26 at 3:45 PM. New M-PESA balance is Ksh2,300.00.\n\nQGH7ZZ1122 Confirmed. You have received Ksh1,000.00 from JANE on 6/1/26 at 9:10 AM…';

  newCount = computed(() => this.result()?.batch.rows.filter((r) => r.status === 'NEW').length ?? 0);

  summary = computed(() => {
    const b = this.result()?.batch;
    if (!b) return '';
    const parts = [`${b.parsedCount} found`];
    if (b.duplicateCount) parts.push(`${b.duplicateCount} duplicate`);
    if (b.unparsedCount) parts.push(`${b.unparsedCount} unreadable`);
    return parts.join(' · ');
  });

  preview(): void {
    if (!this.raw().trim()) return;
    this.loading.set(true);
    this.committedMsg.set(null);
    this.api.previewImport(this.source(), this.raw()).subscribe({
      next: (p) => { this.result.set(p); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  commit(): void {
    const batch = this.result()?.batch;
    if (!batch) return;
    this.committing.set(true);
    this.api.commitImport(batch.id).subscribe({
      next: (b) => {
        this.committing.set(false);
        this.committedMsg.set(`Imported ${b.committedCount} transaction${b.committedCount === 1 ? '' : 's'} into your ledger.`);
        // Reflect committed state in the table.
        this.result.update((r) => (r ? { ...r, batch: b } : r));
      },
      error: () => this.committing.set(false),
    });
  }

  reset(): void {
    this.raw.set('');
    this.result.set(null);
    this.committedMsg.set(null);
  }
}
