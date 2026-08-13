const request = require('supertest');
const { createApp } = require('../../src/app');
const { initFromTerms } = require('../../src/services/autocompleteService');

describe('GET /api/v1/autocomplete', () => {
  const app = createApp();

  beforeAll(() => {
    initFromTerms([
      { term: 'iphone', popularity: 5 },
      { term: 'iphone case', popularity: 50 },
      { term: 'iphone charger', popularity: 10 },
    ]);
  });

  test('returns ranked suggestions for a valid prefix', async () => {
    const res = await request(app).get('/api/v1/autocomplete').query({ q: 'iph' });
    expect(res.status).toBe(200);
    expect(res.body.suggestions[0].word).toBe('iphone case'); // highest popularity
  });

  test('rejects missing q with 400', async () => {
    const res = await request(app).get('/api/v1/autocomplete');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('respects limit parameter', async () => {
    const res = await request(app).get('/api/v1/autocomplete').query({ q: 'iph', limit: 1 });
    expect(res.body.suggestions.length).toBe(1);
  });

  test('rejects limit above max (20) with 400', async () => {
    const res = await request(app).get('/api/v1/autocomplete').query({ q: 'iph', limit: 999 });
    expect(res.status).toBe(400);
  });
});
