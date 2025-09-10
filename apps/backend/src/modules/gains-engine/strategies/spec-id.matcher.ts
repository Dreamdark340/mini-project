import { Trade } from '@shared/types';
import { BaseMatcher } from './base.matcher';

export class SpecIdMatcher extends BaseMatcher {
  orderBuys(buys: Trade[]): Trade[] {
    // For SPEC ID, the UI/backend must inject an explicit order; throw until implemented
    throw new Error('SpecIdMatcher requires explicit lot order input');
  }
}