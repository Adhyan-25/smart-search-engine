const { ConsistentHashRing, moduloAssign } = require('../../src/algorithms/ConsistentHashing');

describe('ConsistentHashRing', () => {
  test('same key always maps to same node while ring is stable', () => {
    const ring = new ConsistentHashRing(50);
    ring.addNode('node-1');
    ring.addNode('node-2');
    ring.addNode('node-3');
    const key = 'product-12345';
    const first = ring.getNode(key);
    for (let i = 0; i < 10; i++) expect(ring.getNode(key)).toBe(first);
  });

  test('removing a node only remaps a minority of keys (vs modulo remapping nearly all)', () => {
    const ring = new ConsistentHashRing(100);
    const nodeIds = ['node-1', 'node-2', 'node-3', 'node-4'];
    nodeIds.forEach((n) => ring.addNode(n));

    const keys = Array.from({ length: 2000 }, (_, i) => `key-${i}`);
    const before = new Map(keys.map((k) => [k, ring.getNode(k)]));

    ring.removeNode('node-2');
    const after = new Map(keys.map((k) => [k, ring.getNode(k)]));

    let remapped = 0;
    keys.forEach((k) => {
      if (before.get(k) !== after.get(k)) remapped += 1;
    });
    const remapFraction = remapped / keys.length;

    // consistent hashing: expect roughly 1/N of keys to move, generous upper bound
    expect(remapFraction).toBeLessThan(0.5);

    // modulo hashing comparison: removing a node changes N, which reshuffles
    // nearly everything since key % 4 vs key % 3 rarely agree
    let moduloRemapped = 0;
    keys.forEach((k) => {
      const before4 = moduloAssign(k, 4, nodeIds);
      const after3 = moduloAssign(k, 3, ['node-1', 'node-3', 'node-4']);
      if (before4 !== after3) moduloRemapped += 1;
    });
    const moduloRemapFraction = moduloRemapped / keys.length;

    expect(moduloRemapFraction).toBeGreaterThan(remapFraction);
  });
});
