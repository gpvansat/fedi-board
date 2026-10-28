'use client';
import { useContext, useState } from 'react';
import { FediDevContext } from '../providers';

export function FediDevToolbar() {
  const [expanded, setExpanded] = useState(false);
  const dev = useContext(FediDevContext);

  if (!dev) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
      }}
    >
      {expanded && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px',
            minWidth: '200px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <Toggle
            label="Mock WebLN"
            value={dev.mockWebLNEnabled}
            onChange={dev.setMockWebLNEnabled}
          />
          <Toggle
            label="Mock Nostr"
            value={dev.mockNostrEnabled}
            onChange={dev.setMockNostrEnabled}
          />
          <button
            onClick={() => dev.setPaymentShouldFail(!dev.paymentShouldFail)}
            style={{
              background: dev.paymentShouldFail ? 'var(--color-accent)' : 'var(--color-surface-2)',
              color: dev.paymentShouldFail ? 'var(--color-primary-foreground)' : 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 8px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {dev.paymentShouldFail ? '⚡ fail: ON' : '⚡ fail: OFF'}
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: 'var(--color-text-subtle)', fontFamily: 'var(--font-mono)' }}>
              mock npub
            </label>
            <input
              type="text"
              placeholder="npub1..."
              value={dev.mockNpub}
              onChange={(e) => dev.setMockNpub(e.target.value)}
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 6px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text)',
                width: '100%',
                outline: 'none',
              }}
            />
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        title="Fedi Dev"
        style={{
          background: expanded ? 'var(--color-accent)' : 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '6px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span style={{ fontSize: '14px' }}>⚙</span>
        <span
          style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            color: expanded ? 'var(--color-primary-foreground)' : 'var(--color-text-muted)',
            letterSpacing: '0.05em',
          }}
        >
          Fedi Dev
        </span>
      </button>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <button
        onClick={() => onChange(!value)}
        style={{
          background: value ? 'var(--color-accent)' : 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: '999px',
          width: '32px',
          height: '18px',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.15s',
          flexShrink: 0,
        }}
        aria-checked={value}
        role="switch"
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: value ? '14px' : '2px',
            width: '12px',
            height: '12px',
            background: 'var(--color-text)',
            borderRadius: '50%',
            transition: 'left 0.15s',
          }}
        />
      </button>
    </div>
  );
}
