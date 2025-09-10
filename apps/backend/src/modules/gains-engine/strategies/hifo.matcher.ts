import { Trade } from '@shared/types';
import { BaseMatcher } from './base.matcher';

export class HifoMatcher extends BaseMatcher {
  orderBuys(buys: Trade[]): Trade[] {
    // Sort by cost basis descending (price * qty) high first
    return buys.sort((a, b) => (b.priceUsd - a.priceUsd));
  }
}