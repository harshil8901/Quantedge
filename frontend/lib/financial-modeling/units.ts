import type { UnitScale } from './types';

const MULTIPLIERS: Record<UnitScale, number> = {
  raw: 1,
  thousands: 1_000,
  millions: 1_000_000,
  billions: 1_000_000_000,
  trillions: 1_000_000_000_000,
};

export const unitMultiplier = (scale: UnitScale) => MULTIPLIERS[scale];

export const toDisplayValue = (raw: number, scale: UnitScale) => {
  const m = MULTIPLIERS[scale];
  return m === 1 ? raw : raw / m;
};

export const fromDisplayValue = (display: number, scale: UnitScale) => display * MULTIPLIERS[scale];

export const unitSuffix = (scale: UnitScale) => {
  if (scale === 'thousands') return 'K';
  if (scale === 'millions') return 'M';
  if (scale === 'billions') return 'B';
  if (scale === 'trillions') return 'T';
  return '';
};
