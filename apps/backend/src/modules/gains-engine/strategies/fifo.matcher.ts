import { LotMatcher } from '../interfaces/lot-matcher.interface';
import { Trade, GainDetail } from '@shared/types';

export class FifoMatcher implements LotMatcher {
  match(trades: Trade[]): GainDetail[] {
    // TODO: implement FIFO matching
    return [];
  }
}