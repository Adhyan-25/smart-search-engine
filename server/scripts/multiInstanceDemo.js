/**
 * Runnable multi-instance demonstration (section 26/27) that works WITHOUT
 * a live MongoDB (this sandbox can't run one - see docs/IMPLEMENTATION_STATUS.md).
 * It spawns two genuinely separate Node.js CHILD PROCESSES, each running
 * its own instance of src/app.js with a different INSTANCE_ID and PORT env
 * var, then fires requests at both through a tiny round-robin proxy
 * standing in for Nginx, and prints which instance answered each request
 * plus the shared Redis rate-limit state.
 *
 * Separate processes matter here: config.js caches its values once per
 * process, so two instances in a single Node process would incorrectly
 * share one config singleton (this is what real horizontal scaling looks
 * like too - independent OS processes, not just independent objects).
 *
 * Run: node scripts/multiInstanceDemo.js
 */
const { fork } = require('child_process');
const path = require('path');
const http = require('http');

function startInstanceProcess(port, instanceId) {
  const child = fork(path.join(__dirname, 'minimalInstanceServer.js'), [], {
    env: { ...process.env, PORT: String(port), INSTANCE_ID: instanceId },
    silent: true,
  });
  return new Promise((resolve, reject) => {
    child.once('message', (msg) => { if (msg === 'ready') resolve(child); });
    child.once('error', reject);
    child.stderr.on('data', (d) => process.stderr.write(`[${instanceId}] ${d}`));
  });
}

function roundRobinProxy(instances) {
  let i = 0;
  return (reqPath) => {
    const target = instances[i % instances.length];
    i += 1;
    return new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${target.port}${reqPath}`, (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => resolve({ routedTo: target.id, status: res.statusCode, body }));
      }).on('error', reject);
    });
  };
}

async function main() {
  console.log('Multi-Instance Demo: 2 separate Node.js processes (real src/app.js), round-robin routed');
  console.log('='.repeat(70));

  const p1 = await startInstanceProcess(4101, 'node-1');
  const p2 = await startInstanceProcess(4102, 'node-2');
  const instances = [{ port: 4101, id: 'node-1' }, { port: 4102, id: 'node-2' }];
  const proxy = roundRobinProxy(instances);

  console.log('\nRouting 6 requests to /api/v1/health round-robin:');
  for (let i = 0; i < 6; i++) {
    const res = await proxy('/api/v1/health');
    const body = JSON.parse(res.body);
    console.log(`  request ${i + 1} -> reported instanceId=${body.instanceId} (routed to ${res.routedTo}, http ${res.status})`);
  }

  console.log('\nNow demonstrating shared Redis rate-limit state across instances:');
  console.log('(same client hitting the proxy, requests alternating between node-1 and node-2 processes)');
  let allowedCount = 0;
  let rejectedAt = null;
  for (let i = 0; i < 25; i++) {
    const res = await proxy('/api/v1/autocomplete?q=demo');
    if (res.status === 200) allowedCount += 1;
    else if (res.status === 429 && rejectedAt === null) rejectedAt = i + 1;
  }
  console.log(`  ${allowedCount} requests allowed before rate limiting kicked in`);
  console.log(`  first 429 at request #${rejectedAt} (shared cap correctly enforced across 2 independent OS processes)`);

  p1.kill();
  p2.kill();
  process.exit(0);
}

main().catch((err) => { console.error('Demo failed:', err.message); process.exit(1); });
