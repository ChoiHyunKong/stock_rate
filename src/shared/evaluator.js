// Simple, transparent scoring engine for stock/ETF quality (0-100)
// Inputs are numeric; caller is responsible for localization/units.

export function sanitizeNumber(value) {
  if (value === null || value === undefined) return NaN;
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  const cleaned = String(value).replace(/[,\s%]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

export function evaluate(raw) {
  const metrics = {
    marketCap: sanitizeNumber(raw.marketCap), // 시가총액 (e.g., KRW billions)
    dividendYield: sanitizeNumber(raw.dividendYield), // %
    aum: sanitizeNumber(raw.aum), // 운용자산 (for ETF)
    nav: sanitizeNumber(raw.nav), // 순자산가치 (per share or total)
    premiumDiscount: sanitizeNumber(raw.premiumDiscount), // 괴리율 %, negative = discount
    fee: sanitizeNumber(raw.fee), // 운용보수 연 %, lower is better
    pbr: sanitizeNumber(raw.pbr),
    per: sanitizeNumber(raw.per),
    roe: sanitizeNumber(raw.roe), // %
    psr: sanitizeNumber(raw.psr)
  };

  const subs = {};

  // Helper to clamp 0..1
  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  // Market cap: favor mid/large caps. 0 at < 200B KRW, 1 at >= 5T KRW equivalent
  subs.marketCap = clamp01((metrics.marketCap - 200) / (5000 - 200));

  // Dividend yield: ideal 2%..6%, penalize 0 and very high (>10%)
  if (!Number.isFinite(metrics.dividendYield)) subs.dividendYield = 0.5;
  else {
    const y = metrics.dividendYield;
    let base = y <= 0 ? 0 : y <= 2 ? 0.5 * (y / 2) : y <= 6 ? 0.5 + 0.5 * ((y - 2) / 4) : 1 - Math.min((y - 6) / 8, 1) * 0.7;
    subs.dividendYield = clamp01(base);
  }

  // AUM: 0 at < 50B, 1 at >= 2T
  subs.aum = clamp01((metrics.aum - 50) / (2000 - 50));

  // Premium/discount: small discount or near-NAV is good; large premium is bad
  if (!Number.isFinite(metrics.premiumDiscount)) subs.premiumDiscount = 0.6;
  else {
    const pd = metrics.premiumDiscount; // %
    // -2%..+2% -> ~1, -10% discount -> 0.8, +10% premium -> 0.2
    const near = 1 - Math.min(Math.abs(pd) / 2, 1) * 0.2; // within 2% is ~0.8-1
    const premiumPenalty = pd > 0 ? Math.min(pd / 10, 1) * 0.6 : 0; // premium worse
    const discountBonus = pd < 0 ? Math.min(Math.abs(pd) / 10, 1) * 0.2 : 0;
    subs.premiumDiscount = clamp01(near - premiumPenalty + discountBonus);
  }

  // Fee: 0 at 2%, 1 at 0%, linearly
  subs.fee = clamp01(1 - (metrics.fee ?? 0) / 2);

  // PBR: sweet spot 0.8..2.5 (depending on sector). Below 0.6 could be value or distress.
  if (!Number.isFinite(metrics.pbr)) subs.pbr = 0.5;
  else {
    const x = metrics.pbr;
    if (x <= 0) subs.pbr = 0;
    else if (x < 0.6) subs.pbr = 0.6 * (x / 0.6);
    else if (x <= 2.5) subs.pbr = 0.6 + 0.4 * ((x - 0.6) / (2.5 - 0.6));
    else subs.pbr = clamp01(1 - Math.min((x - 2.5) / 5, 1) * 0.7);
  }

  // PER: sweet spot 8..22. Negative is bad (losses). Very high is speculative.
  if (!Number.isFinite(metrics.per)) subs.per = 0.5;
  else {
    const x = metrics.per;
    if (x <= 0) subs.per = 0.05;
    else if (x < 8) subs.per = 0.5 * (x / 8);
    else if (x <= 22) subs.per = 0.5 + 0.5 * ((x - 8) / (22 - 8));
    else subs.per = clamp01(1 - Math.min((x - 22) / 40, 1) * 0.8);
  }

  // ROE: higher is better; 5% -> 0.3, 15% -> 0.8, 25%+ -> 1
  subs.roe = clamp01((metrics.roe - 2) / (25 - 2));

  // PSR: 1..6 acceptable; lower better. <1 often deep value; >15 highly speculative.
  if (!Number.isFinite(metrics.psr)) subs.psr = 0.5;
  else {
    const x = metrics.psr;
    if (x <= 0) subs.psr = 0.9; // free cash-like? but unusual; give slight credit
    else if (x <= 1) subs.psr = 1;
    else if (x <= 6) subs.psr = 1 - 0.6 * ((x - 1) / 5); // at 6 -> 0.4
    else subs.psr = clamp01(0.4 - Math.min((x - 6) / 10, 1) * 0.3); // at 16 -> 0.1
  }

  // NAV currently not directly scored (used via premium/discount). Keep placeholder 0.5.
  subs.nav = 0.5;

  // Weights sum to 1
  const weights = {
    marketCap: 0.12,
    dividendYield: 0.10,
    aum: 0.12,
    premiumDiscount: 0.08,
    fee: 0.08,
    pbr: 0.12,
    per: 0.15,
    roe: 0.18,
    psr: 0.05,
    nav: 0.0
  };

  let score01 = 0;
  for (const k of Object.keys(weights)) {
    score01 += (subs[k] ?? 0) * weights[k];
  }

  const score = Math.round(score01 * 100);
  const verdict = score >= 70 ? 'Good' : score >= 50 ? 'Meh' : 'Bad';

  const suggestions = [];
  if (subs.roe < 0.7) suggestions.push('ROE 개선 여부와 수익성 추세를 확인하세요.');
  if (subs.fee < 0.7) suggestions.push('운용보수가 낮은 대안 상품과 비교하세요.');
  if (subs.premiumDiscount < 0.6) suggestions.push('괴리율(프리미엄)이 높으면 매수 시점에 유의하세요.');
  if (subs.per < 0.6) suggestions.push('PER이 높다면 성장성 가정이 타당한지 점검하세요.');
  if (subs.marketCap < 0.5) suggestions.push('소형주의 변동성과 유동성 리스크를 고려하세요.');

  return {
    score,
    verdict,
    metrics,
    subscores: subs,
    suggestions
  };
}
