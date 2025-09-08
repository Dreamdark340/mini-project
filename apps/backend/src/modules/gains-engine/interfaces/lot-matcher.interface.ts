import { Trade, GainDetail } from '@shared/types';

export interface LotMatcher {
  match(trades: Trade[]): GainDetail[];
}