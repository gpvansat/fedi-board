'use client';

interface IManageMiniAppsPermissionHintProps {
  /** When provided, renders a manual retry button (no auto-retry). */
  onRetry?: () => void;
}

/**
 * Explains the Fedi `manageInstalledMiniApps` permission when list or install calls are denied.
 */
export function ManageMiniAppsPermissionHint({ onRetry }: IManageMiniAppsPermissionHintProps) {
  return (
    <div
      className="space-y-2 rounded-lg px-3 py-2.5 text-xs leading-[1.65]"
      style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
      }}
      role="status"
    >
      <p className="font-medium text-[var(--color-text)]">Permission required</p>
      <p className="text-[var(--color-text-muted)]">
        Listing and installing mini apps requires Fedi&apos;s{' '}
        <code className="font-mono">manageInstalledMiniApps</code> permission. Tap{' '}
        <strong className="text-[var(--color-text)]">Allow</strong> when Fedi prompts you.
      </p>
      <p className="text-[var(--color-text-muted)]">
        If you previously chose Deny with &quot;Remember my choice&quot;, reset this permission in
        Fedi&apos;s mini app settings, then try again.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold transition-opacity duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:opacity-80"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-primary-foreground)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}
