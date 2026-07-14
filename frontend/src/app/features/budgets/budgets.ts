import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Budget, BudgetItem, BudgetTemplate, Category, Insight } from '../../core/models';
import { CURRENCIES } from '../../core/currency';
import { MoneyService } from '../../core/money.service';
import { ToastService } from '../../core/toast.service';
import { MoneyComponent } from '../../shared/money';
import { IconPickerComponent } from '../../shared/icon-picker';

interface ItemForm {
  categoryId?: string;
  label: string;
  limitAmount: number;
  icon: string;
  color: string;
}

interface Pick { label: string; icon: string; color: string; categoryId?: string; }

/** Common Kenyan budget lines, so adding categories is one click even when the
 *  user has no matching Category yet (name → icon/colour auto-fill). */
const PRESETS: Pick[] = [
  { label: 'Rent', icon: '🏠', color: '#ef4444' },
  { label: 'Groceries', icon: '🛒', color: '#10b981' },
  { label: 'Transport', icon: '🚌', color: '#3b82f6' },
  { label: 'Airtime & Data', icon: '📱', color: '#8b5cf6' },
  { label: 'Electricity', icon: '💡', color: '#f59e0b' },
  { label: 'Water', icon: '🚰', color: '#14b8a6' },
  { label: 'School fees', icon: '🎓', color: '#6366f1' },
  { label: 'Eating out', icon: '🍔', color: '#f97316' },
  { label: 'Entertainment', icon: '🎬', color: '#ec4899' },
  { label: 'Medical', icon: '🏥', color: '#e11d48' },
  { label: 'Savings', icon: '💰', color: '#22c55e' },
  { label: 'Loan repayment', icon: '🏦', color: '#0ea5e9' },
  { label: 'Shopping', icon: '🛍️', color: '#d946ef' },
  { label: 'Family / Black tax', icon: '👨‍👩‍👧', color: '#a855f7' },
  { label: 'Church / Giving', icon: '⛪', color: '#84cc16' },
  { label: 'Chama', icon: '🤝', color: '#f43f5e' },
];

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [FormsModule, MoneyComponent, IconPickerComponent],
  template: `
    <div class="page-actions">
      <div>
        <h2>Budgets</h2>
        <div class="muted">Plan your month with a ready-made plan or build your own.</div>
      </div>
      <button class="btn btn-primary" (click)="openCreate()"><i class="bi bi-plus-lg"></i> New budget</button>
    </div>

    @if (loading()) {
      <div class="spinner"></div>
    } @else {
      <!-- Ready-made plans -->
      <div class="section-title mt-8">Ready-made plans</div>
      <div class="muted" style="font-size:13px;margin-bottom:14px">Tuned to real Kenyan money realities — pick one, tweak the limits, then save.</div>
      <div class="grid cols-3">
        @for (t of templates(); track t.planType) {
          <div class="card hover plan-card">
            <div class="card-pad">
              <div class="row between">
                <span class="tileicon flat" [style.color]="t.color" style="font-size:22px">{{ t.icon }}</span>
                <span class="badge" [style.color]="t.color" [style.background]="tint(t.color)">{{ t.items.length }} categories</span>
              </div>
              <h3 class="mt-16" style="font-size:17px">{{ t.name }}</h3>
              <div class="muted" style="font-size:12.5px;margin-top:3px">{{ t.audience }}</div>
              <p class="ink2" style="font-size:13px;margin:12px 0 14px;min-height:38px">{{ t.tagline }}</p>
              <div class="row between" style="font-size:13px">
                <span class="muted">Planned income</span>
                <b><app-money [value]="t.expectedIncome" /></b>
              </div>
              <div class="row between mt-8" style="font-size:13px">
                <span class="muted">Total budget</span>
                <b><app-money [value]="templateTotal(t)" /></b>
              </div>
              <button class="btn btn-primary btn-block mt-16" [style.background]="t.color" [style.borderColor]="t.color" [style.boxShadow]="'0 6px 16px ' + tint(t.color)" (click)="useTemplate(t)">
                <i class="bi bi-magic"></i> Use {{ t.name }}
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Insights -->
      @if (insights().length) {
        <div class="card mt-24 insights-card">
          <div class="card-pad">
            <div class="section-title" style="margin-bottom:10px"><i class="bi bi-lightbulb"></i> Budget insights</div>
            @for (ins of insights(); track ins.text) {
              <div class="insight" [class.positive]="ins.kind === 'positive'" [class.warning]="ins.kind === 'warning'" [class.neutral]="ins.kind === 'neutral'">
                <span class="ic">{{ ins.kind === 'positive' ? '✅' : ins.kind === 'warning' ? '⚠️' : '•' }}</span>
                <span>{{ ins.text }}</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Your budgets -->
      <div class="section-title mt-24">Your budgets</div>
      @if (budgets().length === 0) {
        <div class="card mt-8"><div class="empty"><div class="big">📋</div>No budget yet. Apply a plan above or create your own.</div></div>
      } @else {
        <div class="grid cols-2 mt-8">
          @for (b of budgets(); track b.id) {
            <div class="card budget-card" [class.active-budget]="b.isActive" [style.--card-accent]="b.color">
              <div class="card-head">
                <div class="row" style="gap:12px">
                  <span class="tileicon flat" [style.color]="b.color" style="font-size:22px">{{ b.icon }}</span>
                  <div>
                    <h3>{{ b.name }}
                      @if (b.isActive) { <span class="badge" [style.background]="tint(b.color)" [style.color]="b.color" style="margin-left:6px">Active</span> }
                    </h3>
                    <div class="sub">{{ planLabel(b.planType) }} · {{ b.items.length }} categories@if (b.currency && b.currency !== 'KES') { <span> · {{ b.currency }}</span> }</div>
                  </div>
                </div>
                <div class="dropdown">
                  <button class="btn btn-icon btn-ghost" data-bs-toggle="dropdown" aria-label="Options"><i class="bi bi-three-dots"></i></button>
                  <ul class="dropdown-menu dropdown-menu-end">
                    @if (!b.isActive) { <li><button class="dropdown-item" (click)="setActive(b)"><i class="bi bi-check-circle"></i> Set active</button></li> }
                    <li><button class="dropdown-item" (click)="openEdit(b)"><i class="bi bi-pencil"></i> Edit</button></li>
                    <li><button class="dropdown-item" (click)="remove(b)" style="color:var(--critical)"><i class="bi bi-trash"></i> Delete</button></li>
                  </ul>
                </div>
              </div>

              <div class="card-pad">
                <div class="row between mb-2">
                  <div>
                    <div class="muted" style="font-size:12px;font-weight:650;text-transform:uppercase;letter-spacing:.04em">Spent this month</div>
                    <div style="font-size:20px;font-weight:750">
                      <app-money [value]="b.totalSpent" [currency]="b.currency" /> <span class="muted" style="font-size:14px;font-weight:600">/ <app-money [value]="b.totalLimit" [currency]="b.currency" /></span>
                    </div>
                  </div>
                  <div class="text-end">
                    <div class="muted" style="font-size:12px">Remaining</div>
                    <b [class.neg]="b.totalRemaining < 0" [class.pos]="b.totalRemaining >= 0"><app-money [value]="b.totalRemaining" [currency]="b.currency" /></b>
                  </div>
                </div>
                <div class="progress thick" [class.over]="b.totalSpent > b.totalLimit">
                  <span [style.width.%]="pct(b.totalSpent, b.totalLimit)" [style.background]="b.totalSpent > b.totalLimit ? 'var(--critical)' : b.color"></span>
                </div>

                <div class="items mt-16">
                  @for (it of b.items; track it.id) {
                    <div class="item">
                      <span class="txicon flat">{{ it.icon }}</span>
                      <div style="flex:1;min-width:0">
                        <div class="row between" style="gap:8px">
                          <span style="font-weight:600;font-size:13.5px">{{ it.label }}</span>
                          <span style="font-size:12.5px" [class.neg]="it.over">
                            <app-money [value]="it.spent" [currency]="b.currency" /> <span class="muted">/ <app-money [value]="it.limitAmount" [currency]="b.currency" /></span>
                          </span>
                        </div>
                        <div class="progress mt-8" [class.over]="it.over">
                          <span [style.width.%]="pct(it.spent || 0, it.limitAmount)" [style.background]="it.over ? 'var(--critical)' : it.color"></span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    }

    <!-- Create / edit modal -->
    @if (showModal()) {
      <div class="overlay" (click)="closeModal()">
        <div class="modal wide" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>{{ editingId() ? 'Edit budget' : (fromTemplate() ? 'Customise ' + form.name : 'New custom budget') }}</h3>
            <button class="btn btn-icon btn-ghost" (click)="closeModal()"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-body">
            <div class="field"><label>Budget name</label><input class="input input-lg" [(ngModel)]="form.name" placeholder="e.g. My monthly plan" /></div>
            <div class="form-row">
              <div class="field"><label>Planned monthly income</label><input class="input" type="number" [(ngModel)]="form.expectedIncome" /></div>
              <div class="field">
                <label>Currency @if (editingId()) { <span class="muted" style="font-weight:500">· fixed</span> }</label>
                <select class="input" [(ngModel)]="form.currency" [disabled]="!!editingId()">
                  @for (c of currencies; track c.code) { <option [value]="c.code">{{ c.code }} — {{ c.name }}</option> }
                </select>
              </div>
            </div>

            <!-- Icon & colour: optional, collapsed to save space -->
            <div class="row gap-8" style="align-items:center;margin:4px 0 2px">
              <span class="tileicon flat" [style.color]="form.color" style="font-size:20px">{{ form.icon }}</span>
              <button type="button" class="btn btn-sm btn-ghost" (click)="showIcon.set(!showIcon())">
                <i class="bi" [class]="showIcon() ? 'bi-chevron-up' : 'bi-palette'"></i> {{ showIcon() ? 'Done' : 'Icon & colour (optional)' }}
              </button>
            </div>
            @if (showIcon()) { <app-icon-picker [(icon)]="form.icon" [(color)]="form.color" /> }

            <label class="field-label" style="margin-top:18px">Categories &amp; limits</label>

            <!-- Quick add: search + one-click chips (your categories + presets) -->
            <input class="input" [(ngModel)]="catSearch" (ngModelChange)="onSearch()" placeholder="Search to add — e.g. Rent, Airtime, Chama…" />
            @if (filteredPicks().length) {
              <div class="chip-wrap">
                @for (p of filteredPicks(); track p.label) {
                  <button type="button" class="pick-chip" [style.borderColor]="tint(p.color)" (click)="addPick(p)">
                    <span>{{ p.icon }}</span> {{ p.label }} <i class="bi bi-plus"></i>
                  </button>
                }
              </div>
            }

            <div class="builder mt-8">
              @for (it of form.items; track $index) {
                <div class="builder-row">
                  <div class="cat-field">
                    <span class="cat-emoji">{{ it.icon }}</span>
                    <input [(ngModel)]="it.label" placeholder="Category" />
                  </div>
                  <input class="input num amt" type="number" [(ngModel)]="it.limitAmount" placeholder="Limit" />
                  <button class="btn btn-icon btn-ghost" (click)="duplicateItem($index)" title="Duplicate"><i class="bi bi-copy"></i></button>
                  <button class="btn btn-icon btn-ghost" (click)="removeItem($index)" title="Remove"><i class="bi bi-x-lg"></i></button>
                </div>
              } @empty {
                <div class="muted" style="font-size:12.5px">Add categories above, or start a blank one.</div>
              }
              <button class="btn btn-sm mt-8" (click)="addItem()"><i class="bi bi-plus-lg"></i> Add blank category</button>
            </div>

            <div class="row between mt-16" style="padding-top:14px;border-top:1px solid var(--border)">
              <span class="muted">Total budgeted</span>
              <b style="font-size:16px"><app-money [value]="formTotal()" [currency]="form.currency" /></b>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="save()" [disabled]="!canSave() || saving()">
              {{ saving() ? 'Saving…' : (editingId() ? 'Save changes' : 'Create budget') }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .plan-card .card-pad { display: flex; flex-direction: column; height: 100%; }
    .budget-card { --card-accent: var(--brand); }
    .budget-card.active-budget { border-color: color-mix(in srgb, var(--card-accent) 55%, var(--border)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--card-accent) 35%, transparent), var(--shadow); }
    /* Flat icons — no background chip, the emoji sits on the card. */
    .tileicon.flat, .txicon.flat { background: transparent !important; }
    .txicon.flat.sm { width: 30px; height: 30px; font-size: 15px; }
    .items { display: flex; flex-direction: column; gap: 14px; }
    .item { display: flex; align-items: center; gap: 12px; }
    .field-label { font-size: 12.5px; font-weight: 640; color: var(--ink-2); display: block; margin: 6px 0 10px; }
    .builder { display: flex; flex-direction: column; gap: 10px; }
    .builder-row { display: flex; gap: 8px; align-items: center; }
    .input-lg { font-size: 15.5px; font-weight: 600; }
    /* Combined emoji + name field (mirrors how categories read "🏠 Rent"). */
    .cat-field { flex: 1; min-width: 0; display: flex; align-items: center; gap: 7px; padding: 0 11px;
      background: var(--surface); border: 1px solid var(--border-2); border-radius: 10px; }
    .cat-field .cat-emoji { font-size: 16px; flex: none; }
    .cat-field input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; color: var(--ink); font: inherit; padding: 9px 0; }
    .builder-row .amt { max-width: 96px; flex: none; }
    .chip-wrap { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
    .pick-chip { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border-radius: 999px; font-size: 12.5px; font-weight: 560;
      border: 1px solid var(--border-2); background: var(--surface); color: var(--ink-2); cursor: pointer; transition: all .12s; }
    .pick-chip:hover { color: var(--ink); border-color: var(--brand); }
    .pick-chip .bi-plus { color: var(--muted); font-size: 14px; }
    .insights-card .insight { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; padding: 7px 0; }
    .insights-card .insight + .insight { border-top: 1px solid var(--border); }
    .insights-card .insight .ic { flex: none; }
    .insights-card .insight.positive { color: var(--income); }
    .insights-card .insight.warning { color: var(--expense); }
    .insights-card .insight.neutral { color: var(--ink-2); }
    .mb-2 { margin-bottom: 12px; }
    .text-end { text-align: right; }
  `],
})
export class BudgetsComponent implements OnInit {
  private api = inject(ApiService);
  private money = inject(MoneyService);
  private toast = inject(ToastService);

  budgets = signal<Budget[]>([]);
  templates = signal<BudgetTemplate[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  saving = signal(false);

  showModal = signal(false);
  showIcon = signal(false);
  fromTemplate = signal(false);
  editingId = signal<string | null>(null);
  catSearch = '';
  form: { name: string; expectedIncome: number; icon: string; color: string; currency: string; items: ItemForm[] } = { name: '', expectedIncome: 0, icon: '📋', color: '#10a37f', currency: 'KES', items: [] };
  currencies = CURRENCIES;

  expenseCategories = computed(() => this.categories().filter((c) => c.kind === 'EXPENSE'));

  ngOnInit(): void {
    this.reload();
    this.api.budgetTemplates().subscribe((t) => this.templates.set(t));
    this.api.categories().subscribe((c) => this.categories.set(c));
  }

  reload(): void {
    this.loading.set(true);
    this.api.budgets().subscribe({
      next: (b) => { this.budgets.set(this.sort(b)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  private sort(b: Budget[]): Budget[] {
    return [...b].sort((x, y) => (y.isActive ? 1 : 0) - (x.isActive ? 1 : 0));
  }

  // ---- insights (client-computed from the active budget) ----
  insights = computed<Insight[]>(() => {
    const b = this.budgets().find((x) => x.isActive) ?? this.budgets()[0];
    if (!b || b.totalLimit <= 0) return [];
    const out: Insight[] = [];
    const used = Math.round((b.totalSpent / b.totalLimit) * 100);
    const now = new Date();
    const daysIn = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const pace = Math.round((now.getDate() / daysIn) * 100);

    if (used > 100) {
      out.push({ kind: 'warning', text: `You're over ${b.name} — ${used}% spent (${this.money.format(b.totalSpent - b.totalLimit)} over).` });
    } else if (used >= 85) {
      out.push({ kind: 'warning', text: `Getting close on ${b.name}: ${used}% used, ${this.money.format(b.totalRemaining)} left.` });
    } else {
      out.push({ kind: 'positive', text: `On track — ${used}% of ${b.name} used, ${this.money.format(b.totalRemaining)} still to spend.` });
    }

    if (used > pace + 15 && used <= 100) {
      out.push({ kind: 'warning', text: `Spending faster than the month: ${used}% used but only ${pace}% through the month.` });
    }

    const over = b.items.filter((i) => i.over);
    if (over.length) {
      const worst = over.slice(0, 2).map((i) => i.label).join(' and ');
      out.push({ kind: 'warning', text: `Over budget on ${worst}${over.length > 2 ? ` +${over.length - 2} more` : ''}.` });
    }
    return out;
  });

  // ---- quick-add picks (your categories + presets, minus already-added) ----
  private picks(): Pick[] {
    const cats: Pick[] = this.expenseCategories().map((c) => ({ label: c.name, icon: c.icon, color: c.color, categoryId: c.id }));
    const names = new Set(cats.map((c) => c.label.toLowerCase()));
    const presets = PRESETS.filter((p) => !names.has(p.label.toLowerCase()));
    return [...cats, ...presets];
  }

  filteredPicks(): Pick[] {
    const q = this.catSearch.trim().toLowerCase();
    const added = new Set(this.form.items.map((i) => i.label.trim().toLowerCase()));
    return this.picks()
      .filter((p) => !added.has(p.label.toLowerCase()) && (!q || p.label.toLowerCase().includes(q)))
      .slice(0, q ? 20 : 10);
  }

  onSearch(): void { /* triggers change detection so filteredPicks() re-evaluates */ }

  addPick(p: Pick): void {
    this.form.items.push({ categoryId: p.categoryId, label: p.label, limitAmount: 0, icon: p.icon, color: p.color });
    this.catSearch = '';
  }

  tint(color: string): string { return `color-mix(in srgb, ${color} 15%, transparent)`; }
  pct(a: number, b: number): number { return b > 0 ? Math.min((a / b) * 100, 100) : 0; }
  templateTotal(t: BudgetTemplate): number { return t.items.reduce((s, i) => s + i.limit, 0); }
  formTotal(): number { return this.form.items.reduce((s, i) => s + (+i.limitAmount || 0), 0); }
  planLabel(p: string): string {
    return { COMRADE: 'Comrade plan', HUSTLER: 'Hustler plan', CORPORATE: 'Corporate plan', CUSTOM: 'Custom plan' }[p] ?? p;
  }

  /** "Use this plan" now pre-fills the editable create form (nothing is saved
   *  until the user confirms), instead of silently appending a budget. */
  useTemplate(t: BudgetTemplate): void {
    this.editingId.set(null);
    this.fromTemplate.set(true);
    this.showIcon.set(false);
    this.catSearch = '';
    this.form = {
      name: t.name,
      expectedIncome: t.expectedIncome,
      icon: t.icon,
      color: t.color,
      currency: 'KES',
      items: t.items.map((i) => ({ categoryId: this.matchCategory(i.category), label: i.category, limitAmount: i.limit, icon: i.icon, color: i.color })),
    };
    this.showModal.set(true);
  }

  private matchCategory(name: string): string | undefined {
    return this.expenseCategories().find((c) => c.name.toLowerCase() === name.toLowerCase())?.id;
  }

  setActive(b: Budget): void {
    this.api.updateBudget(b.id, { isActive: true }).subscribe(() => { this.toast.success(`${b.name} is now active`); this.reload(); });
  }

  async remove(b: Budget): Promise<void> {
    const ok = await this.toast.confirm({ title: `Delete "${b.name}"?`, confirmText: 'Delete', danger: true });
    if (!ok) return;
    this.api.deleteBudget(b.id).subscribe(() => { this.toast.success('Budget deleted'); this.reload(); });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.fromTemplate.set(false);
    this.showIcon.set(false);
    this.catSearch = '';
    this.form = { name: '', expectedIncome: 0, icon: '📋', color: '#10a37f', currency: 'KES', items: [] };
    this.showModal.set(true);
  }

  openEdit(b: Budget): void {
    this.editingId.set(b.id);
    this.fromTemplate.set(false);
    this.showIcon.set(false);
    this.catSearch = '';
    this.form = {
      name: b.name,
      expectedIncome: b.expectedIncome,
      icon: b.icon,
      color: b.color,
      currency: b.currency ?? 'KES',
      items: b.items.map((i) => ({ categoryId: i.categoryId, label: i.label, limitAmount: i.limitAmount, icon: i.icon, color: i.color })),
    };
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  addItem(): void { this.form.items.push({ label: '', limitAmount: 0, icon: '💸', color: '#64748b' }); }
  duplicateItem(i: number): void {
    const src = this.form.items[i];
    this.form.items.splice(i + 1, 0, { ...src, categoryId: undefined, label: `${src.label} copy` });
  }
  removeItem(i: number): void { this.form.items.splice(i, 1); }

  canSave(): boolean {
    return this.form.name.trim().length > 0 && this.form.items.some((i) => i.limitAmount > 0 && i.label.trim());
  }

  save(): void {
    const items: BudgetItem[] = this.form.items
      .filter((i) => i.label.trim() && i.limitAmount > 0)
      .map((i) => ({ categoryId: i.categoryId, label: i.label.trim(), limitAmount: +i.limitAmount, icon: i.icon, color: i.color }));
    const body: any = { name: this.form.name.trim(), expectedIncome: +this.form.expectedIncome || 0, icon: this.form.icon, color: this.form.color, items, planType: 'CUSTOM', isActive: true };
    const editing = this.editingId();
    // Currency is set at creation and then fixed (Update DTO doesn't accept it).
    if (!editing) body.currency = this.form.currency || 'KES';
    this.saving.set(true);
    const req = editing ? this.api.updateBudget(editing, body) : this.api.createBudget(body);
    req.subscribe({
      next: () => { this.saving.set(false); this.showModal.set(false); this.toast.success(editing ? 'Budget updated' : `${body.name} created & set active`); this.reload(); },
      error: () => { this.saving.set(false); this.toast.error('Could not save the budget'); },
    });
  }
}
