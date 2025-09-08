import { LotMatcher } from '../interfaces/lot-matcher.interface';
import { Trade, GainDetail } from '@shared/types';

export abstract class BaseMatcher implements LotMatcher {
  abstract orderBuys(buys: Trade[]): Trade[];

  match(trades: Trade[]): GainDetail[] {
    const buys = trades.filter(t => t.quantity > 0);
    const sells = trades.filter(t => t.quantity < 0);
    const orderedBuys = this.orderBuys([...buys]);

    const lotQueue: { trade: Trade; remaining: number }[] = orderedBuys.map(b => ({ trade: b, remaining: b.quantity }));

    const details: GainDetail[] = [];

    for (const sell of sells.sort((a,b)=> a.executedAt.getTime() - b.executedAt.getTime())) {
      let qtyToMatch = -sell.quantity; // positive number
      while (qtyToMatch > 0 && lotQueue.length) {
        const lot = lotQueue[0];
        const matchQty = Math.min(qtyToMatch, lot.remaining);
        const costBasis = matchQty * lot.trade.priceUsd + this.proratedFee(lot.trade.feeUsd, lot.trade.quantity, matchQty);
        const proceeds = matchQty * sell.priceUsd - this.proratedFee(sell.feeUsd, -sell.quantity, matchQty);
        const holdingPeriod = (sell.executedAt.getTime() - lot.trade.executedAt.getTime()) / (1000*3600*24);
        details.push({
          tradeId: sell.id,
          gainUsd: proceeds - costBasis,
          basisUsd: costBasis,
          holdingPeriodDays: Math.round(holdingPeriod),
          longTerm: holdingPeriod > 365,
        });
        lot.remaining -= matchQty;
        if(lot.remaining === 0) lotQueue.shift();
        qtyToMatch -= matchQty;
      }
    }
    return details;
  }

  private proratedFee(feeUsd: number, totalQty: number, portionQty: number){
    if(!feeUsd) return 0;
    return feeUsd * (portionQty/totalQty);
  }
}