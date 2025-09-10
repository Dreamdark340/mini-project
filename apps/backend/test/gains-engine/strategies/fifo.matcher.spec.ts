import { FifoMatcher } from '../../../../src/modules/gains-engine/strategies/fifo.matcher';

describe('FifoMatcher', () => {
  it('returns empty array when no trades', () => {
    const matcher = new FifoMatcher();
    expect(matcher.match([])).toEqual([]);
  });
});