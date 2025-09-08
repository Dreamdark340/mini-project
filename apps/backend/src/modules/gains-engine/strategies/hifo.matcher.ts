import { LotMatcher } from '../interfaces/lot-matcher.interface';
import { Trade, GainDetail } from '@shared/types';

export class HifoMatcher implements LotMatcher {
  match(trades: Trade[]): GainDetail[] {
    // TODO: implement HIFO (Highest-In-First-Out) matching
    return [];
  }
}