const { buildOffsetPagination, buildOffsetMeta, encodeCursor, decodeCursor } = require('../../src/utils/pagination');

describe('pagination utils', () => {
  test('buildOffsetPagination computes correct skip', () => {
    expect(buildOffsetPagination(1, 20)).toEqual({ skip: 0, limit: 20 });
    expect(buildOffsetPagination(3, 20)).toEqual({ skip: 40, limit: 20 });
  });

  test('buildOffsetPagination clamps invalid page/limit', () => {
    expect(buildOffsetPagination(0, 20)).toEqual({ skip: 0, limit: 20 });
    expect(buildOffsetPagination(1, 0)).toEqual({ skip: 0, limit: 1 });
  });

  test('buildOffsetMeta reports correct flags', () => {
    const meta = buildOffsetMeta(2, 10, 25);
    expect(meta.totalPages).toBe(3);
    expect(meta.hasNextPage).toBe(true);
    expect(meta.hasPreviousPage).toBe(true);
  });

  test('cursor encode/decode round-trips', () => {
    const id = '507f1f77bcf86cd799439011';
    const encoded = encodeCursor(id);
    expect(decodeCursor(encoded)).toBe(id);
  });

  test('decodeCursor returns null-ish on garbage input gracefully', () => {
    expect(() => decodeCursor('not-valid-base64!!!')).not.toThrow();
  });
});
