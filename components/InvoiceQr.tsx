'use client';

import { QRCodeSVG } from 'qrcode.react';

/** SVG-safe foreground color for QR codes (CSS variables break in some WebViews). */
export const QR_FOREGROUND = '#e8e8e8';

interface IInvoiceQrProps {
  value: string;
  size?: number;
  label?: string;
}

/** Renders a BOLT11 or LNURL string as a scannable QR code. */
export function InvoiceQr({ value, size = 136, label = 'Invoice QR code' }: IInvoiceQrProps) {
  return (
    <div
      className="mx-auto flex w-full max-w-[160px] items-center justify-center rounded-lg p-3"
      style={{ background: 'var(--color-surface-2)' }}
      aria-label={label}
    >
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        bgColor="transparent"
        fgColor={QR_FOREGROUND}
      />
    </div>
  );
}
