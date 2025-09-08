import { Trade } from '@shared/types';
import { BaseMatcher } from './base.matcher';

export class LifoMatcher extends BaseMatcher {
  orderBuys(buys: Trade[]): Trade[] {
    // Newest buys first
    return buys.sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
  }
}