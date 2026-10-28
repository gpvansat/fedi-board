'use client';

import { useFediBalance } from '../../hooks/useFediBalance';
import { FediVersionBadge } from './FediVersionBadge';
import { InstallMiniAppButton, type IInstallMiniAppProps } from './InstallMiniAppButton';
import { ManageMiniAppsPermissionHint } from './ManageMiniAppsPermissionHint';

interface IBalanceDisplayProps {
  /** When provided, renders an "Add to Fedi" install prompt (v2 only). */
  installApp?: IInstallMiniAppProps;
}

function truncateUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    const display = `${parsed.hostname}${path}`;
    return display.length > 36 ? `${display.slice(0, 33)}…` : display;
  } catch {
    return url.length > 36 ? `${url.slice(0, 33)}…` : url;
  }
}

function OpenInFediPrompt() {
  return (
    <div
      className="rounded-xl px-4 py-5 text-center"
      style={{
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <p className="mb-1 text-sm font-semibold text-[var(--color-text)]">Open in Fedi</p>
      <p className="mx-auto max-w-[32ch] text-xs leading-[1.65] text-[var(--color-text-muted)]">
        This feature reads <code className="font-mono">window.fediInternal</code>, which is only
        injected inside the Fedi app. Open this mini app from Fedi to see installed apps and install
        prompts.
      </p>
    </div>
  );
}

/**
 * Shows fediInternal version, installed mini apps (v2), and an optional install button.
 */
export function BalanceDisplay({ installApp }: IBalanceDisplayProps) {
  const { state, loadMiniApps } = useFediBalance();

  if (state.status === 'loading') {
    return (
      <div
        className="rounded-xl px-4 py-5"
        style={{
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <p className="text-sm text-[var(--color-text-subtle)]">Checking Fedi environment…</p>
      </div>
    );
  }

  if (state.status === 'unavailable') {
    return <OpenInFediPrompt />;
  }

  const { version, miniAppsLoad } = state;

  return (
    <div
      className="flex flex-col gap-4 rounded-xl p-4"
      style={{
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-[var(--color-text)]">Fedi internal API</p>
          <p className="font-mono text-xs text-[var(--color-text-muted)]">
            window.fediInternal.version = {version}
          </p>
        </div>
        <FediVersionBadge />
      </div>

      {version < 2 && (
        <p className="text-xs leading-[1.65] text-[var(--color-text-muted)]">
          Installed mini apps and install prompts require fediInternal v2. You are on v{version}.
        </p>
      )}

      {version === 2 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--color-text-subtle)]">
            Installed mini apps
            {miniAppsLoad.status === 'loaded' ? ` (${miniAppsLoad.miniApps.length})` : ''}
          </p>

          {miniAppsLoad.status === 'idle' && (
            <button
              type="button"
              onClick={() => void loadMiniApps()}
              className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:opacity-80"
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              Load installed apps
            </button>
          )}

          {miniAppsLoad.status === 'loading' && (
            <p className="text-xs text-[var(--color-text-muted)]">Loading installed apps…</p>
          )}

          {miniAppsLoad.status === 'permissionDenied' && (
            <ManageMiniAppsPermissionHint onRetry={() => void loadMiniApps()} />
          )}

          {miniAppsLoad.status === 'error' && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Could not load installed apps. Check your connection and try again.
            </p>
          )}

          {miniAppsLoad.status === 'loaded' && miniAppsLoad.miniApps.length === 0 && (
            <p className="text-xs text-[var(--color-text-muted)]">No mini apps installed yet.</p>
          )}

          {miniAppsLoad.status === 'loaded' && miniAppsLoad.miniApps.length > 0 && (
            <ul className="flex flex-col gap-1.5" aria-label="Installed mini apps">
              {miniAppsLoad.miniApps.map((app) => (
                <li key={app.url}>
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-opacity duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:opacity-80"
                    style={{
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                    }}
                    aria-label={`Open mini app: ${app.url}`}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs"
                      style={{
                        background: 'var(--color-accent-dim)',
                        color: 'var(--color-accent)',
                      }}
                      aria-hidden
                    >
                      ↗
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs text-[var(--color-text)]">
                        {truncateUrl(app.url)}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-[var(--color-text-muted)]">
                        {app.url}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {installApp && (
        <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
          <p className="text-xs font-medium text-[var(--color-text-subtle)]">Install mini app</p>
          <InstallMiniAppButton {...installApp} />
        </div>
      )}
    </div>
  );
}
