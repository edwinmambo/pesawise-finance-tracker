import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { SavingsGoal } from '../../core/models';
import { MoneyComponent } from '../../shared/money';
import { RingComponent } from '../../shared/ring';
import { fmtDate, todayIso } from '../../core/format';

const ICONS = ['🎯', '🛟', '🎓', '🎄', '🏠', '🚗', '✈️', '💍', '🏥', '📱', '💻', '🐖'];
// Savings identity leads with violet (the --savings token) then the usual palette.
const COLORS = ['#6b57d3', '#2a78d6', '#4a3aa7', '#16a34a', '#dc2626', '#eda100', '#e87ba4', '#eb6834'];

interface GoalForm { name: string; targetAmount: number | null; targetDate: string; icon: string; color: string; }

@Component({
  selector: 'app-savings',
  standalone: true,
  imports: [FormsModule, MoneyComponent, RingComponent],
  template: `
    <div class="page-actions">
      <div><h2 class="section-title">💜 Savings goals</h2><div class="muted"><app-money [value]="totalSaved()" /> saved toward <app-money [value]="totalTarget()" /> in goals</div></div>
      <button class="btn sv-btn" (click)="openNew()"><i class="bi bi-plus-lg"></i> New goal</button>
    </div>

    @if (loading()) { <div class="spinner"></div> }
    @else if (goals().length) {
      <div class="grid cols-3">
        @for (g of goals(); track g.id) {
          <div class="card card-pad sv-card" style="display:flex;flex-direction:column;gap:14px">
            <div class="between">
              <div style="font-weight:700;font-size:15px">{{ g.icon }} {{ g.name }}</div>
              <button class="btn btn-ghost btn-sm btn-icon" (click)="remove(g)"><i class="bi bi-trash"></i></button>
            </div>
            <div style="display:flex;justify-content:center">
              <app-ring [progress]="g.progress" [color]="g.color" [size]="128" [thickness]="12" [sub]="'saved'" />
            </div>
            <div style="text-align:center">
              <div class="saved-amt" style="font-size:19px;font-weight:720;letter-spacing:-.02em"><app-money [value]="g.savedAmount" /></div>
              <div class="muted" style="font-size:12.5px">of <app-money [value]="g.targetAmount" /></div>
            </div>
            <div class="between" style="font-size:12.5px;color:var(--ink-2)">
              <span><app-money [value]="g.remaining" /> to go</span>
              @if (g.targetDate) { <span class="muted">by {{ date(g.targetDate) }}</span> }
            </div>
            <button class="btn sv-btn btn-sm" (click)="openContribute(g)"><i class="bi bi-plus-lg"></i> Add contribution</button>
          </div>
        }
      </div>
    } @else {
      <div class="card"><div class="empty"><div class="big">🎯</div>No savings goals yet. Create one — an emergency fund, school fees, or a holiday.</div></div>
    }

    <!-- New goal modal -->
    @if (showGoal()) {
      <div class="overlay" (click)="showGoal.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head"><h3>New savings goal</h3><button class="btn btn-icon btn-ghost" (click)="showGoal.set(false)"><i class="bi bi-x-lg"></i></button></div>
          <div class="modal-body">
            <div class="field"><label>Goal name</label><input class="input" [(ngModel)]="gf.name" placeholder="e.g. Emergency Fund" /></div>
            <div class="form-row">
              <div class="field"><label>Target amount (KES)</label><input class="input" type="number" [(ngModel)]="gf.targetAmount" placeholder="0" /></div>
              <div class="field"><label>Target date (optional)</label><input class="input" type="date" [(ngModel)]="gf.targetDate" /></div>
            </div>
            <div class="field"><label>Icon</label>
              <div class="row wrap gap-8">
                @for (i of icons; track i) { <button class="pick" [class.on]="gf.icon === i" (click)="gf.icon = i">{{ i }}</button> }
              </div>
            </div>
            <div class="field"><label>Colour</label>
              <div class="row wrap gap-8">
                @for (c of colors; track c) { <button class="swatch" [class.on]="gf.color === c" [style.background]="c" (click)="gf.color = c"></button> }
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="showGoal.set(false)">Cancel</button>
            <button class="btn sv-btn" (click)="saveGoal()" [disabled]="!gf.name || !gf.targetAmount || saving()">Create goal</button>
          </div>
        </div>
      </div>
    }

    <!-- Contribute modal -->
    @if (contribGoal(); as cg) {
      <div class="overlay" (click)="contribGoal.set(null)">
        <div class="modal" style="max-width:420px;width:100%" (click)="$event.stopPropagation()">
          <div class="modal-head"><h3>{{ cg.icon }} {{ cg.name }}</h3><button class="btn btn-icon btn-ghost" (click)="contribGoal.set(null)"><i class="bi bi-x-lg"></i></button></div>
          <div class="modal-body">
            <div class="muted" style="font-size:12.5px;margin-bottom:14px"><app-money [value]="cg.savedAmount" /> of <app-money [value]="cg.targetAmount" /> · <app-money [value]="cg.remaining" /> to go</div>
            <div class="form-row">
              <div class="field"><label>Amount (KES)</label><input class="input" type="number" [(ngModel)]="contrib.amount" placeholder="0" /></div>
              <div class="field"><label>Date</label><input class="input" type="date" [(ngModel)]="contrib.date" /></div>
            </div>
            <div class="field"><label>Note (optional)</label><input class="input" [(ngModel)]="contrib.note" placeholder="e.g. Monthly saving" /></div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="contribGoal.set(null)">Cancel</button>
            <button class="btn sv-btn" (click)="saveContribution()" [disabled]="!contrib.amount || saving()">Add</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* Savings gets its own violet identity (the --savings design token), the way
       loans are themed in each lender's brand colour. */
    .sv-card { border-top: 3px solid var(--savings); }
    .saved-amt { color: var(--savings); }
    .sv-btn { background: var(--savings); border-color: var(--savings); color: #fff; box-shadow: 0 6px 16px color-mix(in srgb, var(--savings) 30%, transparent); }
    .sv-btn:hover { background: color-mix(in srgb, var(--savings) 86%, #000); border-color: color-mix(in srgb, var(--savings) 86%, #000); }
    .pick { width: 40px; height: 40px; border-radius: 10px; border: 1px solid var(--border-2); background: var(--surface); font-size: 18px; cursor: pointer; }
    .pick.on { border-color: var(--savings); background: color-mix(in srgb, var(--savings) 14%, var(--surface)); }
    .swatch { width: 32px; height: 32px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; }
    .swatch.on { border-color: var(--ink); box-shadow: 0 0 0 2px var(--surface) inset; }
  `],
})
export class SavingsComponent implements OnInit {
  private api = inject(ApiService);
  goals = signal<SavingsGoal[]>([]);
  loading = signal(true);
  saving = signal(false);

  icons = ICONS;
  colors = COLORS;

  showGoal = signal(false);
  gf: GoalForm = this.blankGoal();

  contribGoal = signal<SavingsGoal | null>(null);
  contrib = { amount: null as number | null, date: todayIso(), note: '' };

  ngOnInit(): void { this.reload(); }
  reload(): void {
    this.loading.set(true);
    this.api.savingsGoals().subscribe((g) => { this.goals.set(g); this.loading.set(false); });
  }

  totalSaved(): number { return this.goals().reduce((s, g) => s + g.savedAmount, 0); }
  totalTarget(): number { return this.goals().reduce((s, g) => s + g.targetAmount, 0); }

  blankGoal(): GoalForm { return { name: '', targetAmount: null, targetDate: '', icon: '🎯', color: '#6b57d3' }; }
  openNew(): void { this.gf = this.blankGoal(); this.showGoal.set(true); }

  saveGoal(): void {
    if (!this.gf.name || !this.gf.targetAmount) return;
    this.saving.set(true);
    this.api.createGoal({
      name: this.gf.name, targetAmount: Number(this.gf.targetAmount),
      targetDate: this.gf.targetDate || undefined, icon: this.gf.icon, color: this.gf.color,
    }).subscribe({
      next: () => { this.saving.set(false); this.showGoal.set(false); this.reload(); },
      error: () => this.saving.set(false),
    });
  }

  remove(g: SavingsGoal): void {
    if (!confirm(`Delete goal "${g.name}"?`)) return;
    this.api.deleteGoal(g.id).subscribe(() => this.reload());
  }

  openContribute(g: SavingsGoal): void { this.contrib = { amount: null, date: todayIso(), note: '' }; this.contribGoal.set(g); }
  saveContribution(): void {
    const g = this.contribGoal();
    if (!g || !this.contrib.amount) return;
    this.saving.set(true);
    this.api.addContribution(g.id, { amount: Number(this.contrib.amount), date: this.contrib.date, note: this.contrib.note || undefined }).subscribe({
      next: () => { this.saving.set(false); this.contribGoal.set(null); this.reload(); },
      error: () => this.saving.set(false),
    });
  }

  date(iso: string): string { return fmtDate(iso); }
}
