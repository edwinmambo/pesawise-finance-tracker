import { BudgetPlanType } from '../common/enums';

export interface TemplateItem {
  /** Category name — matched to (or created as) a user category so spend is tracked. */
  category: string;
  icon: string;
  color: string;
  limit: number;
}

export interface BudgetTemplate {
  planType: BudgetPlanType;
  name: string;
  icon: string;
  color: string;
  tagline: string;
  /** Who it's for, shown on the picker card. */
  audience: string;
  expectedIncome: number;
  items: TemplateItem[];
}

/**
 * Premade budget plans tuned to real Kenyan money realities. Users can apply
 * one as-is, then tweak the limits — or build a fully custom plan from scratch.
 */
export const BUDGET_TEMPLATES: BudgetTemplate[] = [
  {
    planType: BudgetPlanType.COMRADE,
    name: 'Comrade Budget',
    icon: '🎓',
    color: '#2563eb',
    audience: 'Campus & high-school students',
    tagline: 'Stretch HELB, pocket money and side-hustle cash to end month strong.',
    expectedIncome: 16000,
    items: [
      { category: 'Food & Mess', icon: '🍲', color: '#f97316', limit: 4500 },
      { category: 'Hostel & Rent', icon: '🏠', color: '#ef4444', limit: 3500 },
      { category: 'Transport & Fare', icon: '🚌', color: '#0ea5e9', limit: 2000 },
      { category: 'Airtime & Data', icon: '📱', color: '#22c55e', limit: 1500 },
      { category: 'Books & Printing', icon: '📚', color: '#6366f1', limit: 1200 },
      { category: 'Entertainment', icon: '🎬', color: '#ec4899', limit: 1500 },
      { category: 'Savings', icon: '🐖', color: '#16a34a', limit: 1500 },
    ],
  },
  {
    planType: BudgetPlanType.HUSTLER,
    name: 'Hustler Budget',
    icon: '💪',
    color: '#ea580c',
    audience: 'Casual & gig workers (mjengo, boda, mama mboga)',
    tagline: 'Irregular income? Cover the essentials first, then stock and savings.',
    expectedIncome: 32000,
    items: [
      { category: 'Food & Shopping', icon: '🛍️', color: '#f97316', limit: 8000 },
      { category: 'Rent', icon: '🏠', color: '#ef4444', limit: 6000 },
      { category: 'Transport & Fuel', icon: '⛽', color: '#0ea5e9', limit: 3500 },
      { category: 'Stock & Tools', icon: '🧰', color: '#a16207', limit: 4500 },
      { category: 'Family Support', icon: '👪', color: '#14b8a6', limit: 3000 },
      { category: 'Airtime & Data', icon: '📱', color: '#22c55e', limit: 1500 },
      { category: 'Chama & Savings', icon: '🤝', color: '#16a34a', limit: 3000 },
      { category: 'Emergency Fund', icon: '🛟', color: '#0d9488', limit: 2500 },
    ],
  },
  {
    planType: BudgetPlanType.CORPORATE,
    name: 'Corporate Budget',
    icon: '💼',
    color: '#4f46e5',
    audience: 'Salaried & permanent employees',
    tagline: 'A 50/30/20-style plan for salary earners — needs, wants, wealth.',
    expectedIncome: 130000,
    items: [
      { category: 'Rent', icon: '🏠', color: '#ef4444', limit: 32000 },
      { category: 'Food & Shopping', icon: '🛍️', color: '#f97316', limit: 18000 },
      { category: 'Transport & Fuel', icon: '⛽', color: '#0ea5e9', limit: 12000 },
      { category: 'Loan Repayment', icon: '🏦', color: '#64748b', limit: 15000 },
      { category: 'SACCO & Savings', icon: '🤝', color: '#16a34a', limit: 18000 },
      { category: 'Investments', icon: '📈', color: '#0891b2', limit: 12000 },
      { category: 'Utilities', icon: '💡', color: '#eab308', limit: 6000 },
      { category: 'Medical & Insurance', icon: '💊', color: '#e11d48', limit: 6000 },
      { category: 'Entertainment', icon: '🎬', color: '#ec4899', limit: 8000 },
    ],
  },
];

export function findTemplate(planType: BudgetPlanType): BudgetTemplate | undefined {
  return BUDGET_TEMPLATES.find((t) => t.planType === planType);
}
