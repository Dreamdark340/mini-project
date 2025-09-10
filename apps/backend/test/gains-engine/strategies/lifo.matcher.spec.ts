import { LifoMatcher } from '../../../../src/modules/gains-engine/strategies/lifo.matcher';

describe('LifoMatcher', () => {
  it('returns empty array when no trades', () => {
    const matcher = new LifoMatcher();
    expect(matcher.match([])).toEqual([]);
  });
});