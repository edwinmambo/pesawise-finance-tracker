import { booleanAttribute, Component, computed, inject, input } from '@angular/core';
import { MoneyService } from '../core/money.service';
import { PrivacyService } from '../core/privacy.service';

/**
 * Renders a money value as a small-caps currency symbol + a tabular number
 * (Space Grotesk). Blurs the number when balances are hidden — globally
 * (PrivacyService) or via a local `[hidden]` override.
 *
 * Two ways to get a signed +/− and income/expense colour:
 *  - `signed`      → derives sign/colour from the numeric sign of the value.
 *  - `[direction]` → forces it from the transaction *direction* ('in' | 'out'),
 *    independent of the stored sign. Use this for transactions, whose amounts
 *    are stored positive so `signed` alone can't tell income from expense.
 *
 *   <app-money [value]="t.amount" [direction]="dir(t)" />   // income vs expense
 *   <app-money [value]="net" signed />                       // net (numeric)
 *   <app-money [value]="bal" [hidden]="cardHidden()" />      // plain, privacy-aware
 *
 * Host uses individual class bindings so an external `class="…"` still merges.
 */
@Component({
  selector: 'app-money',
  standalone: true,
  host: {
    class: 'money',
    '[class.masked]': 'masked()',
    '[class.pos]': 'colored() && effSign() > 0',
    '[class.neg]': 'colored() && effSign() < 0',
  },
  template: `<span class="cur">{{ symbol() }}</span><span class="num">{{ signChar() }}{{ num() }}</span>`,
})
export class MoneyComponent {
  private money = inject(MoneyService);
  private privacy = inject(PrivacyService);

  value = input<number | null | undefined>(0);
  decimals = input(false, { transform: booleanAttribute });
  signed = input(false, { transform: booleanAttribute });
  /** Force direction from the transaction type, overriding the numeric sign. */
  direction = input<'in' | 'out' | '' | undefined>(undefined);
  /** Local override; when undefined, follows the global privacy setting. */
  hidden = input<boolean | undefined>(undefined);

  masked = computed(() => this.hidden() ?? this.privacy.hidden());
  symbol = computed(() => this.money.symbol());
  num = computed(() => this.money.formatNumber(this.value() ?? 0, this.decimals()));

  /** Whether a sign/colour should be applied at all. */
  colored = computed(() => this.signed() || !!this.direction());
  /** +1 / −1 from the forced direction, else from the numeric sign. */
  effSign = computed(() => {
    const d = this.direction();
    if (d === 'in') return 1;
    if (d === 'out') return -1;
    return (this.value() ?? 0) < 0 ? -1 : 1;
  });
  signChar = computed(() => (this.colored() ? (this.effSign() < 0 ? '−' : '+') : ''));
}
