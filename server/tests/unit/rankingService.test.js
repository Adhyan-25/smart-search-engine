const { scoreProduct, rankProducts } = require('../../src/services/rankingService');

describe('rankingService', () => {
  test('exact title match scores highest', () => {
    const exact = scoreProduct({ title: 'iphone', keywords: [], popularity: 0, rating: 0 }, 'iphone');
    const partial = scoreProduct({ title: 'iphone case', keywords: [], popularity: 0, rating: 0 }, 'iphone');
    expect(exact.score).toBeGreaterThan(partial.score);
  });

  test('higher popularity and rating increase score', () => {
    const low = scoreProduct({ title: 'phone case', keywords: [], popularity: 1, rating: 1 }, 'case');
    const high = scoreProduct({ title: 'phone case', keywords: [], popularity: 10000, rating: 5 }, 'case');
    expect(high.score).toBeGreaterThan(low.score);
  });

  test('rankProducts sorts descending by score', () => {
    const products = [
      { title: 'random item', keywords: [], popularity: 1, rating: 1 },
      { title: 'iphone', keywords: [], popularity: 100, rating: 5 },
      { title: 'iphone case', keywords: [], popularity: 50, rating: 3 },
    ];
    const ranked = rankProducts(products, 'iphone');
    expect(ranked[0].title).toBe('iphone');
    expect(ranked[ranked.length - 1].title).toBe('random item');
  });

  test('breakdown explains the score components', () => {
    const { breakdown } = scoreProduct({ title: 'iphone', keywords: ['smartphone'], popularity: 100, rating: 4 }, 'iphone');
    expect(breakdown).toHaveProperty('exactTitleMatch');
    expect(breakdown).toHaveProperty('popularity');
    expect(breakdown).toHaveProperty('rating');
  });
});
