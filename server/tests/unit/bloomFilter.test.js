const { BloomFilter } = require('../../src/algorithms/BloomFilter');

describe('BloomFilter', () => {
  test('never false-negatives an inserted item', () => {
    const bf = new BloomFilter(1000, 0.01);
    const items = Array.from({ length: 500 }, (_, i) => `item-${i}`);
    items.forEach((it) => bf.add(it));
    items.forEach((it) => expect(bf.mightContain(it)).toBe(true));
  });

  test('mostly rejects items never inserted (bounded false-positive rate)', () => {
    const bf = new BloomFilter(1000, 0.01);
    for (let i = 0; i < 1000; i++) bf.add(`in-${i}`);

    let falsePositives = 0;
    const trials = 5000;
    for (let i = 0; i < trials; i++) {
      if (bf.mightContain(`out-${i}`)) falsePositives += 1;
    }
    const observedRate = falsePositives / trials;
    // allow generous margin since this is a probabilistic structure
    expect(observedRate).toBeLessThan(0.05);
  });

  test('currentFalsePositiveRate is a plausible probability', () => {
    const bf = new BloomFilter(1000, 0.01);
    for (let i = 0; i < 1000; i++) bf.add(`x-${i}`);
    const rate = bf.currentFalsePositiveRate();
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThan(1);
  });
});
