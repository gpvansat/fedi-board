import { describe, expect, it } from 'vitest';
import { isFediPermissionError } from '../fedi';

describe('isFediPermissionError', () => {
  it('detects permission denied errors', () => {
    expect(isFediPermissionError(new Error('Permission denied: manageInstalledMiniApps'))).toBe(
      true,
    );
  });

  it('detects missing-permissions toast messages', () => {
    expect(
      isFediPermissionError(
        new Error('create-fedi-app-demo is missing the following permissions: manageInstalledMiniApps'),
      ),
    ).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isFediPermissionError(new Error('Network request failed'))).toBe(false);
    expect(isFediPermissionError('not an error object')).toBe(false);
  });
});
