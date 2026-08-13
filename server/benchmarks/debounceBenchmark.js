/**
 * Debounce demonstration: simulates a user typing "iphone case" keystroke
 * by keystroke, and counts how many autocomplete requests would fire
 * without debouncing vs with a 275ms debounce. This is a pure timing
 * simulation (no real network calls) so it's deterministic and runnable
 * in any environment, including this sandbox.
 * Run: node benchmarks/debounceBenchmark.js
 */

function debounce(fn, delayMs) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

function simulateTyping(word, keystrokeIntervalMs, onKeystroke) {
  return new Promise((resolve) => {
    let i = 0;
    const typed = [];
    const interval = setInterval(() => {
      i += 1;
      typed.push(word.slice(0, i));
      onKeystroke(typed[typed.length - 1]);
      if (i >= word.length) {
        clearInterval(interval);
        setTimeout(resolve, keystrokeIntervalMs + 400); // wait for trailing debounce to fire
      }
    }, keystrokeIntervalMs);
  });
}

async function main() {
  const word = 'iphone case';
  const keystrokeIntervalMs = 90; // realistic average typing speed

  console.log('Debounce Benchmark: simulated typing of "iphone case"');
  console.log(`Keystroke interval: ${keystrokeIntervalMs}ms, debounce delay: 275ms`);
  console.log('='.repeat(70));

  let noDebounceCount = 0;
  await simulateTyping(word, keystrokeIntervalMs, () => { noDebounceCount += 1; });

  let debouncedCount = 0;
  const debouncedFn = debounce(() => { debouncedCount += 1; }, 275);
  await simulateTyping(word, keystrokeIntervalMs, debouncedFn);

  console.log(`\nWithout debounce: ${noDebounceCount} requests (one per keystroke)`);
  console.log(`With 275ms debounce: ${debouncedCount} requests`);
  console.log(`\nRequests reduced by ${(((noDebounceCount - debouncedCount) / noDebounceCount) * 100).toFixed(1)}% (measured).`);
}

main();
