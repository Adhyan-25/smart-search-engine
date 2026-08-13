/**
 * Benchmark: consistent hashing vs modulo hashing key remapping on node
 * add/remove. Run: node benchmarks/consistentHashing.js
 */
const { ConsistentHashRing, moduloAssign } = require('../src/algorithms/ConsistentHashing');

function remapFraction(beforeMap, afterMap, keys) {
  let remapped = 0;
  keys.forEach((k) => {
    if (beforeMap.get(k) !== afterMap.get(k)) remapped += 1;
  });
  return remapped / keys.length;
}

function main() {
  const keys = Array.from({ length: 10000 }, (_, i) => `key-${i}`);
  const initialNodes = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

  console.log('Consistent Hashing vs Modulo Hashing - Node Removal Impact');
  console.log(`Keys: ${keys.length.toLocaleString()}, Nodes: ${initialNodes.length} -> ${initialNodes.length - 1}`);
  console.log('='.repeat(70));

  // Consistent hashing
  const ring = new ConsistentHashRing(150);
  initialNodes.forEach((n) => ring.addNode(n));
  const chBefore = new Map(keys.map((k) => [k, ring.getNode(k)]));
  ring.removeNode('node-3');
  const chAfter = new Map(keys.map((k) => [k, ring.getNode(k)]));
  const chRemapFraction = remapFraction(chBefore, chAfter, keys);

  // Modulo hashing
  const remainingNodes = initialNodes.filter((n) => n !== 'node-3');
  const modBefore = new Map(keys.map((k) => [k, moduloAssign(k, initialNodes.length, initialNodes)]));
  const modAfter = new Map(keys.map((k) => [k, moduloAssign(k, remainingNodes.length, remainingNodes)]));
  const modRemapFraction = remapFraction(modBefore, modAfter, keys);

  console.log(`\nConsistent hashing: ${(chRemapFraction * 100).toFixed(1)}% of keys remapped`);
  console.log(`  (theoretical expectation: roughly 1/${initialNodes.length} = ${(100 / initialNodes.length).toFixed(1)}%)`);
  console.log(`Modulo hashing:     ${(modRemapFraction * 100).toFixed(1)}% of keys remapped`);
  console.log(`  (nearly all keys move because key % 5 vs key % 4 rarely agree)`);
  console.log(`\nConsistent hashing remapped ${(modRemapFraction / chRemapFraction).toFixed(1)}x fewer keys than modulo hashing (measured).`);
}

main();
