import { Channel } from './models';

/** Colour per payment channel, for compact colour-coded labels. */
export const CHANNEL_COLORS: Record<Channel, string> = {
  MPESA: '#16a34a',
  BANK: '#2563eb',
  CASH: '#d98400',
  SACCO: '#7c3aed',
};

export function channelColor(ch: Channel): string {
  return CHANNEL_COLORS[ch] ?? '#64748b';
}

export function channelLabel(ch: string): string {
  return ch === 'MPESA' ? 'M-Pesa' : ch.charAt(0) + ch.slice(1).toLowerCase();
}
