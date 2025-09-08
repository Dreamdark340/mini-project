import { LotMatcher } from '../interfaces/lot-matcher.interface';
import { Trade, GainDetail } from '@shared/types';

export class SpecIdMatcher implements LotMatcher {
  match(trades: Trade[]): GainDetail[] {
    // TODO: implement Specific Identification matching (requires lot selection)
    return [];
  }
}