import { HifoMatcher } from '../../../../src/modules/gains-engine/strategies/hifo.matcher';

describe('HifoMatcher', () => {
  it('returns empty array when no trades', () => {
    const matcher = new HifoMatcher();
    expect(matcher.match([])).toEqual([]);
  });
});