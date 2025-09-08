import { Trade } from '@shared/types';
import { BaseMatcher } from './base.matcher';

export class FifoMatcher extends BaseMatcher {
  orderBuys(buys: Trade[]): Trade[] {
    // Oldest buys first (executedAt ascending)
    return buys.sort((a, b) => a.executedAt.getTime() - b.executedAt.getTime());
  }
}