import { LenderType } from './models';

/**
 * Brand colours for common Kenyan lenders — matched by a substring of the
 * lender name (case-insensitive). Falls back to a per-lender-type palette.
 */
const BANK_COLORS: { key: string; color: string }[] = [
  { key: 'equity', color: '#e4002b' },
  { key: 'kcb', color: '#00954c' },
  { key: 'co-op', color: '#00a94f' },
  { key: 'cooperative', color: '#00a94f' },
  { key: 'absa', color: '#dc0032' },
  { key: 'stanbic', color: '#0033a0' },
  { key: 'standard chartered', color: '#0072ce' },
  { key: 'ncba', color: '#8a1538' },
  { key: 'dtb', color: '#0093d0' },
  { key: 'diamond trust', color: '#0093d0' },
  { key: 'family', color: '#f58220' },
  { key: 'i&m', color: '#003da5' },
  { key: 'im bank', color: '#003da5' },
  { key: 'national bank', color: '#004b87' },
  { key: 'gulf', color: '#00843d' },
  { key: 'sidian', color: '#e2231a' },
  { key: 'stima', color: '#7c3aed' },
  { key: 'harambee', color: '#6d28d9' },
  { key: 'sacco', color: '#0d9488' },
  { key: 'tala', color: '#12b886' },
  { key: 'branch', color: '#4c36e8' },
  { key: 'm-shwari', color: '#63a70a' },
  { key: 'mshwari', color: '#63a70a' },
  { key: 'fuliza', color: '#3fa535' },
  { key: 'watu', color: '#f7941d' },
  { key: 'mogo', color: '#e30613' },
  { key: 'zenka', color: '#ff5a00' },
  { key: 'okash', color: '#00b16a' },
];

const TYPE_FALLBACK: Record<LenderType, string> = {
  BANK: '#2563eb',
  MOBILE_APP: '#7c3aed',
  SACCO: '#0d9488',
  INDIVIDUAL: '#64748b',
};

export function bankColor(lender: string, lenderType: LenderType): string {
  const l = (lender || '').toLowerCase();
  const hit = BANK_COLORS.find((b) => l.includes(b.key));
  return hit?.color ?? TYPE_FALLBACK[lenderType] ?? '#64748b';
}

export function lenderIcon(lenderType: LenderType): string {
  switch (lenderType) {
    case 'MOBILE_APP': return 'bi-phone';
    case 'SACCO': return 'bi-people-fill';
    case 'INDIVIDUAL': return 'bi-person-fill';
    default: return 'bi-bank';
  }
}
