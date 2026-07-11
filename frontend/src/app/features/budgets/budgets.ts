import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Budget, BudgetItem, BudgetTemplate, Category } from '../../core/models';
import { KesPipe } from '../../core/kes.pipe';
import { IconPickerComponent } from '../../shared/icon-picker';

interface ItemForm {
  categoryId?: string;
  label: string;
  limitAmount: number;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [FormsModule, KesPipe, IconPickerComponent],
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
      <div class="muted" style="font-size:13px;margin-bottom:14px">Tuned to real Kenyan money realities — apply one, then tweak the limits.</div>
      <div class="grid cols-3">
        @for (t of templates(); track t.planType) {
          <div class="card hover plan-card">
            <div class="card-pad">
              <div class="row between">
                <span class="tileicon" [style.background]="tint(t.color)" [style.color]="t.color" style="font-size:19px">{{ t.icon }}</span>
                <span class="badge" [style.color]="t.color" [style.background]="tint(t.color)">{{ t.items.length }} categories</span>
              </div>
              <h3 class="mt-16" style="font-size:17px">{{ t.name }}</h3>
              <div class="muted" style="font-size:12.5px;margin-top:3px">{{ t.audience }}</div>
              <p class="ink2" style="font-size:13px;margin:12px 0 14px;min-height:38px">{{ t.tagline }}</p>
              <div class="row between" style="font-size:13px">
                <span class="muted">Planned income</span>
                <b class="tabnum">{{ t.expectedIncome | kes }}</b>
              </div>
              <div class="row between mt-8" style="font-size:13px">
                <span class="muted">Total budget</span>
                <b class="tabnum">{{ templateTotal(t) | kes }}</b>
              </div>
              <button class="btn btn-primary btn-block mt-16" (click)="applyTemplate(t)" [disabled]="applying()">
                <i class="bi bi-magic"></i> Use this plan
              </button>
            </div>
          </div>
        }
      </div>

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
                  <span class="tileicon" [style.background]="tint(b.color)" [style.color]="b.color" style="font-size:19px">{{ b.icon }}</span>
                  <div>
                    <h3>{{ b.name }}
                      @if (b.isActive) { <span class="badge" [style.background]="tint(b.color)" [style.color]="b.color" style="margin-left:6px">Active</span> }
                    </h3>
                    <div class="sub">{{ planLabel(b.planType) }} · {{ b.items.length }} categories</div>
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
                    <div style="font-size:22px;font-weight:750" class="tabnum">
                      {{ b.totalSpent | kes }} <span class="muted" style="font-size:14px;font-weight:600">/ {{ b.totalLimit | kes }}</span>
                    </div>
                  </div>
                  <div class="text-end">
                    <div class="muted" style="font-size:12px">Remaining</div>
                    <b class="tabnum" [class.neg]="b.totalRemaining < 0" [class.pos]="b.totalRemaining >= 0">{{ b.totalRemaining | kes }}</b>
                  </div>
                </div>
                <div class="progress thick" [class.over]="b.totalSpent > b.totalLimit">
                  <span [style.width.%]="pct(b.totalSpent, b.totalLimit)" [style.background]="b.totalSpent > b.totalLimit ? 'var(--critical)' : b.color"></span>
                </div>

                <div class="items mt-16">
                  @for (it of b.items; track it.id) {
                    <div class="item">
                      <span class="txicon" [style.background]="tint(it.color)">{{ it.icon }}</span>
                      <div style="flex:1;min-width:0">
                        <div class="row between" style="gap:8px">
                          <span style="font-weight:600;font-size:13.5px">{{ it.label }}</span>
                          <span class="tabnum" style="font-size:12.5px" [class.neg]="it.over">
                            {{ it.spent | kes }} <span class="muted">/ {{ it.limitAmount | kes }}</span>
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
            <h3>{{ editingId() ? 'Edit budget' : 'New custom budget' }}</h3>
            <button class="btn btn-icon btn-ghost" (click)="closeModal()"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="field"><label>Budget name</label><input class="input" [(ngModel)]="form.name" placeholder="My monthly plan" /></div>
              <div class="field"><label>Planned monthly income (KES)</label><input class="input" type="number" [(ngModel)]="form.expectedIncome" /></div>
            </div>

            <div class="row gap-8" style="align-items:center;margin:2px 0 12px">
              <span class="tileicon" [style.background]="tint(form.color)" [style.color]="form.color" style="font-size:18px">{{ form.icon }}</span>
              <span class="muted" style="font-size:12.5px">Give this budget its own icon &amp; theme colour</span>
            </div>
            <app-icon-picker [(icon)]="form.icon" [(color)]="form.color" />

            <label class="field-label" style="margin-top:18px">Categories &amp; limits</label>
            <div class="builder">
              @for (it of form.items; track $index) {
                <div class="builder-row">
                  <select class="input" [ngModel]="it.categoryId" (ngModelChange)="onCategoryPick(it, $event)">
                    <option [ngValue]="undefined">Custom label…</option>
                    @for (c of expenseCategories(); track c.id) {
                      <option [ngValue]="c.id">{{ c.icon }} {{ c.name }}</option>
                    }
                  </select>
                  @if (!it.categoryId) {
                    <input class="input" [(ngModel)]="it.label" placeholder="Label" style="max-width:150px" />
                  }
                  <input class="input num" type="number" [(ngModel)]="it.limitAmount" placeholder="Limit" style="max-width:130px" />
                  <button class="btn btn-icon btn-ghost" (click)="removeItem($index)" aria-label="Remove"><i class="bi bi-x-lg"></i></button>
                </div>
              }
              <button class="btn btn-sm mt-8" (click)="addItem()"><i class="bi bi-plus-lg"></i> Add category</button>
            </div>

            <div class="row between mt-16" style="padding-top:14px;border-top:1px solid var(--border)">
              <span class="muted">Total budgeted</span>
              <b class="tabnum" style="font-size:16px">{{ formTotal() | kes }}</b>
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
    .items { display: flex; flex-direction: column; gap: 14px; }
    .item { display: flex; align-items: center; gap: 12px; }
    .field-label { font-size: 12.5px; font-weight: 640; color: var(--ink-2); display: block; margin: 6px 0 10px; }
    .builder { display: flex; flex-direction: column; gap: 10px; }
    .builder-row { display: flex; gap: 8px; align-items: center; }
    .builder-row .input { flex: 1; }
    .mb-2 { margin-bottom: 12px; }
    .text-end { text-align: right; }
  `],
})
export class BudgetsComponent implements OnInit {
  private api = inject(ApiService);

  budgets = signal<Budget[]>([]);
  templates = signal<BudgetTemplate[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  applying = signal(false);
  saving = signal(false);

  showModal = signal(false);
  editingId = signal<string | null>(null);
  form: { name: string; expectedIncome: number; icon: string; color: string; items: ItemForm[] } = { name: '', expectedIncome: 0, icon: '📋', color: '#10a37f', items: [] };

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

  tint(color: string): string { return `color-mix(in srgb, ${color} 15%, transparent)`; }
  pct(a: number, b: number): number { return b > 0 ? Math.min((a / b) * 100, 100) : 0; }
  templateTotal(t: BudgetTemplate): number { return t.items.reduce((s, i) => s + i.limit, 0); }
  formTotal(): number { return this.form.items.reduce((s, i) => s + (+i.limitAmount || 0), 0); }
  planLabel(p: string): string {
    return { COMRADE: 'Comrade plan', HUSTLER: 'Hustler plan', CORPORATE: 'Corporate plan', CUSTOM: 'Custom plan' }[p] ?? p;
  }

  applyTemplate(t: BudgetTemplate): void {
    this.applying.set(true);
    this.api.applyTemplate(t.planType).subscribe({
      next: () => { this.applying.set(false); this.reload(); },
      error: () => this.applying.set(false),
    });
  }

  setActive(b: Budget): void {
    this.api.updateBudget(b.id, { isActive: true }).subscribe(() => this.reload());
  }

  remove(b: Budget): void {
    if (!confirm(`Delete "${b.name}"?`)) return;
    this.api.deleteBudget(b.id).subscribe(() => this.reload());
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form = { name: '', expectedIncome: 0, icon: '📋', color: '#10a37f', items: [{ label: '', limitAmount: 0, icon: '💸', color: '#64748b' }] };
    this.showModal.set(true);
  }

  openEdit(b: Budget): void {
    this.editingId.set(b.id);
    this.form = {
      name: b.name,
      expectedIncome: b.expectedIncome,
      icon: b.icon,
      color: b.color,
      items: b.items.map((i) => ({ categoryId: i.categoryId, label: i.label, limitAmount: i.limitAmount, icon: i.icon, color: i.color })),
    };
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  addItem(): void { this.form.items.push({ label: '', limitAmount: 0, icon: '💸', color: '#64748b' }); }
  removeItem(i: number): void { this.form.items.splice(i, 1); }

  onCategoryPick(it: ItemForm, categoryId: string | undefined): void {
    it.categoryId = categoryId;
    const c = this.categories().find((x) => x.id === categoryId);
    if (c) { it.label = c.name; it.icon = c.icon; it.color = c.color; }
  }

  canSave(): boolean {
    return this.form.name.trim().length > 0 && this.form.items.some((i) => i.limitAmount > 0 && i.label.trim());
  }

  save(): void {
    const items: BudgetItem[] = this.form.items
      .filter((i) => i.label.trim() && i.limitAmount > 0)
      .map((i) => ({ categoryId: i.categoryId, label: i.label.trim(), limitAmount: +i.limitAmount, icon: i.icon, color: i.color }));
    const body: any = { name: this.form.name.trim(), expectedIncome: +this.form.expectedIncome || 0, icon: this.form.icon, color: this.form.color, items, planType: 'CUSTOM', isActive: true };
    this.saving.set(true);
    const req = this.editingId()
      ? this.api.updateBudget(this.editingId()!, body)
      : this.api.createBudget(body);
    req.subscribe({
      next: () => { this.saving.set(false); this.showModal.set(false); this.reload(); },
      error: () => this.saving.set(false),
    });
  }
}
