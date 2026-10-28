'use client';

import { useState } from 'react';
import { isFediPermissionError } from '../../lib/fedi';
import { useFediInternal } from '../../hooks/useFediInternal';
import { ManageMiniAppsPermissionHint } from './ManageMiniAppsPermissionHint';

export interface IInstallMiniAppProps {
  id: string;
  title: string;
  url: string;
  imageUrl?: string | null;
  description?: string;
}

type TInstallStatus = 'idle' | 'installing' | 'done' | 'error' | 'permissionDenied';

/**
 * Triggers Fedi's native install prompt for a mini app (requires fediInternal v2).
 */
export function InstallMiniAppButton({
  id,
  title,
  url,
  imageUrl,
  description,
}: IInstallMiniAppProps) {
  const { installMiniApp: installMiniAppFn } = useFediInternal();
  const [status, setStatus] = useState<TInstallStatus>('idle');

  if (!installMiniAppFn) {
    return (
      <p className="text-xs leading-[1.65] text-[var(--color-text-muted)]">
        Install prompts require fediInternal v2 inside the Fedi app.
      </p>
    );
  }

  const installMiniApp = installMiniAppFn;

  async function handleInstall() {
    setStatus('installing');
    try {
      await installMiniApp({ id, title, url, imageUrl, description });
      setStatus('done');
    } catch (err) {
      setStatus(isFediPermissionError(err) ? 'permissionDenied' : 'error');
    }
  }

  const label =
    status === 'installing'
      ? 'Opening prompt…'
      : status === 'done'
        ? 'Prompt closed'
        : status === 'error'
          ? 'Try again'
          : `Add "${title}" to Fedi`;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleInstall}
        disabled={status === 'installing'}
        className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:opacity-80 active:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: status === 'error' ? 'var(--color-surface-2)' : 'var(--color-accent)',
          color: status === 'error' ? 'var(--color-text)' : 'var(--color-primary-foreground)',
          border:
            status === 'error' ? '1px solid var(--color-border)' : '1px solid transparent',
          borderRadius: 'var(--radius-md)',
        }}
        aria-label={`Install mini app: ${title}`}
      >
        {label}
      </button>
      {status === 'permissionDenied' && (
        <ManageMiniAppsPermissionHint onRetry={() => void handleInstall()} />
      )}
    </div>
  );
}
