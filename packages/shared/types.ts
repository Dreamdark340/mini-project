export interface Trade {
  id: string;
  userId: string;
  asset: string;
  quantity: number;
  priceUsd: number;
  feeUsd: number;
  executedAt: Date;
}

export interface Lot {
  tradeId: string;
  remainingQty: number;
  costBasisUsd: number;
}

export interface GainDetail {
  tradeId: string;
  gainUsd: number;
  basisUsd: number;
  holdingPeriodDays: number;
  longTerm: boolean;
}

export interface GainSummary {
  shortTermGain: number;
  longTermGain: number;
  totalGain: number;
}

export type CostBasisMethod = 'FIFO' | 'LIFO' | 'HIFO' | 'SPEC_ID';

export interface WhatIfSession {
  id: string;
  userId: string;
  method: CostBasisMethod;
  createdAt: Date;
  summary: GainSummary;
}