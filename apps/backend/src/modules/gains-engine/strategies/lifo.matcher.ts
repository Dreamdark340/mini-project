import { LotMatcher } from '../interfaces/lot-matcher.interface';
import { Trade, GainDetail } from '@shared/types';

export class LifoMatcher implements LotMatcher {
  match(trades: Trade[]): GainDetail[] {
    // TODO: implement LIFO matching
    return [];
  }
}