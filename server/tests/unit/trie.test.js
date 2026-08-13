const { Trie } = require('../../src/algorithms/Trie');

describe('Trie', () => {
  test('insert + search exact word', () => {
    const trie = new Trie();
    trie.insert('iphone');
    expect(trie.search('iphone')).toBe(true);
    expect(trie.search('iphon')).toBe(false);
  });

  test('startsWith', () => {
    const trie = new Trie();
    trie.insert('iphone case');
    expect(trie.startsWith('iph')).toBe(true);
    expect(trie.startsWith('xyz')).toBe(false);
  });

  test('getSuggestions ranks by popularity', () => {
    const trie = new Trie();
    trie.insert('iphone', 5);
    trie.insert('iphone case', 50);
    trie.insert('iphone charger', 10);
    const results = trie.getSuggestions('iph', 10).map((r) => r.word);
    expect(results).toEqual(['iphone case', 'iphone charger', 'iphone']);
  });

  test('getSuggestions respects limit', () => {
    const trie = new Trie();
    for (let i = 0; i < 20; i++) trie.insert(`item${i}`, i);
    expect(trie.getSuggestions('item', 5).length).toBe(5);
  });

  test('getSuggestions returns empty for unknown prefix', () => {
    const trie = new Trie();
    trie.insert('phone');
    expect(trie.getSuggestions('zzz')).toEqual([]);
  });

  test('bumpPopularity increases rank', () => {
    const trie = new Trie();
    trie.insert('a', 1);
    trie.insert('b', 1);
    trie.bumpPopularity('b', 100);
    const results = trie.getSuggestions('', 2).map((r) => r.word);
    expect(results[0]).toBe('b');
  });

  test('case insensitivity', () => {
    const trie = new Trie();
    trie.insert('iPhone');
    expect(trie.search('iphone')).toBe(true);
  });

  test('count tracks distinct words', () => {
    const trie = new Trie();
    trie.insert('a');
    trie.insert('a'); // duplicate
    trie.insert('b');
    expect(trie.count()).toBe(2);
  });
});
