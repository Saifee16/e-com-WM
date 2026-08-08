import { describe, expect, it } from 'vitest';
import { getApiErrorMessage } from './api-error';

describe('getApiErrorMessage', () => {
  it('surfaces a safe field-level backend validation error', () => {
    const error = {
      response: {
        data: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: [{ path: ['imageUrl'], message: 'Product image URLs must use HTTPS' }],
          },
        },
      },
    };

    expect(getApiErrorMessage(error, 'Failed to add product')).toBe(
      'image url: Product image URLs must use HTTPS',
    );
  });

  it('falls back without exposing unknown detail shapes', () => {
    const error = {
      response: {
        data: {
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: [{ stack: 'private' }] },
        },
      },
    };

    expect(getApiErrorMessage(error, 'Failed to add product')).toBe('Validation failed');
  });
});
