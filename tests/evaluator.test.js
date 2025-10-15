import { describe, it, expect } from 'vitest';
import { evaluate } from '../src/shared/evaluator.js';

describe('evaluate()', () => {
  it('scores a solid large-cap dividend stock as Good-ish', () => {
    const res = evaluate({
      marketCap: 8000, // 8조
      dividendYield: 3.2,
      aum: 2000,
      nav: 100,
      premiumDiscount: -0.5,
      fee: 0.2,
      pbr: 1.3,
      per: 14,
      roe: 18,
      psr: 2.5
    });
    expect(res.score).toBeGreaterThanOrEqual(65);
    expect(['Good', 'Meh']).toContain(res.verdict);
  });

  it('penalizes high premium and extreme PER', () => {
    const res = evaluate({
      marketCap: 600,
      dividendYield: 1.0,
      aum: 80,
      nav: 100,
      premiumDiscount: 8.0, // 큰 프리미엄
      fee: 1.2,
      pbr: 4.0,
      per: 80, // 과도
      roe: 4,
      psr: 10
    });
    expect(res.score).toBeLessThan(50);
    expect(res.verdict).toBe('Bad');
  });
});
