import { Injectable } from '@nestjs/common';
import { Trade, GainDetail, GainSummary, CostBasisMethod } from '@shared/types';
import { LotMatcher } from './interfaces/lot-matcher.interface';
import { FifoMatcher } from './strategies/fifo.matcher';
import { LifoMatcher } from './strategies/lifo.matcher';
import { HifoMatcher } from './strategies/hifo.matcher';
import { SpecIdMatcher } from './strategies/spec-id.matcher';

@Injectable()
export class GainsEngineService {
  private readonly matchers: Record<CostBasisMethod, LotMatcher> = {
    FIFO: new FifoMatcher(),
    LIFO: new LifoMatcher(),
    HIFO: new HifoMatcher(),
    SPEC_ID: new SpecIdMatcher(),
  };

  calculate(trades: Trade[], method: CostBasisMethod = 'FIFO'): { summary: GainSummary; details: GainDetail[] } {
    const matcher = this.matchers[method] ?? this.matchers.FIFO;
    const details = matcher.match(trades);
    const summary = details.reduce<GainSummary>(
      (acc, d) => {
        if (d.longTerm) acc.longTermGain += d.gainUsd;
        else acc.shortTermGain += d.gainUsd;
        acc.totalGain = acc.shortTermGain + acc.longTermGain;
        return acc;
      },
      { shortTermGain: 0, longTermGain: 0, totalGain: 0 }
    );
    return { summary, details };
  }
}