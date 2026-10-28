'use client';

import { useEffect, useState } from 'react';
import { getFediInternalVersion } from '../../lib/fedi';

/**
 * Small debug badge showing the detected `window.fediInternal` API version.
 */
export function FediVersionBadge() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const version = getFediInternalVersion();
    setLabel(version === null ? 'Not in Fedi' : `v${version}`);
  }, []);

  const inFedi = label !== null && label !== 'Not in Fedi';

  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide"
      style={{
        background: inFedi ? 'var(--color-accent-dim)' : 'var(--color-surface-2)',
        color: inFedi ? 'var(--color-accent)' : 'var(--color-text-muted)',
        borderRadius: 'var(--radius-sm)',
      }}
      title={
        label === null
          ? 'Detecting Fedi environment…'
          : inFedi
            ? `fediInternal API ${label}`
            : 'window.fediInternal is not available in this environment'
      }
      aria-label={label === null ? 'Detecting Fedi environment' : `Fedi internal API: ${label}`}
    >
      {label ?? '…'}
    </span>
  );
}
