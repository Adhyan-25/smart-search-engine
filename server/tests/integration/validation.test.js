const request = require('supertest');
const { createApp } = require('../../src/app');

describe('Search query validation', () => {
  const app = createApp();

  test('rejects invalid sort value', async () => {
    const res = await request(app).get('/api/v1/search').query({ q: 'test', sort: 'not-a-real-sort' });
    expect(res.status).toBe(400);
  });

  test('rejects limit above max', async () => {
    const res = await request(app).get('/api/v1/search').query({ q: 'test', limit: 500 });
    expect(res.status).toBe(400);
  });

  test('rejects negative page', async () => {
    const res = await request(app).get('/api/v1/search').query({ q: 'test', page: -1 });
    expect(res.status).toBe(400);
  });

  test('rejects rating out of 0-5 range', async () => {
    const res = await request(app).get('/api/v1/search').query({ q: 'test', minRating: 10 });
    expect(res.status).toBe(400);
  });
});
