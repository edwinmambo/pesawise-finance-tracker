import { booleanAttribute, Component, computed, inject, input } from '@angular/core';
import { MoneyService } from '../core/money.service';
import { PrivacyService } from '../core/privacy.service';

/**
 * Renders a money value as a small-caps currency symbol + a tabular number
 * (Space Grotesk). Blurs the number when balances are hidden — globally
 * (PrivacyService) or via a local `[hidden]` override. `signed` adds +/− and
 * income/expense colour.
 *
 *   <app-money [value]="t.amount" signed />
 *   <app-money [value]="net" [hidden]="cardHidden()" />
 *
 * Host uses individual class bindings so an external `class="…"` still merges.
 */
@Component({
  selector: 'app-money',
  standalone: true,
  host: {
    class: 'money',
    '[class.masked]': 'masked()',
    '[class.pos]': 'signed() && (value() ?? 0) >= 0',
    '[class.neg]': 'signed() && (value() ?? 0) < 0',
  },
  template: `<span class="cur">{{ symbol() }}</span><span class="num">{{ sign() }}{{ num() }}</span>`,
})
export class MoneyComponent {
  private money = inject(MoneyService);
  private privacy = inject(PrivacyService);

  value = input<number | null | undefined>(0);
  decimals = input(false, { transform: booleanAttribute });
  signed = input(false, { transform: booleanAttribute });
  /** Local override; when undefined, follows the global privacy setting. */
  hidden = input<boolean | undefined>(undefined);

  masked = computed(() => this.hidden() ?? this.privacy.hidden());
  symbol = computed(() => this.money.symbol());
  num = computed(() => this.money.formatNumber(this.value() ?? 0, this.decimals()));
  sign = computed(() => (this.signed() ? ((this.value() ?? 0) < 0 ? '−' : '+') : ''));
}
