'use client';
import { useCallback, useEffect, useState } from 'react';
import { APP_NAME, APP_TAGLINE, CATEGORIES, LIMITS } from '../../lib/config';
import { authedFetch, confirmWithServer } from '../../lib/board/client';
import { hexToNpub } from '../../lib/board/npub';
import { useIdentity, useNostr } from '../../lib/nostr';
import { usePayment, useWebLN } from '../../lib/webln';

interface IListing {
  id: string;
  pubkey: string;
  category: string;
  title: string;
  body: string;
  priceSats: number | null;
  location: string | null;
  bumpedAt: number;
  expiresAt: number;
  status?: string;
}

const catLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 60) return `${Math.max(m, 1)}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

export function Board() {
  const { isAvailable: hasWebln, isLoading: weblnLoading } = useWebLN();
  const { isAvailable: hasNostr, isLoading: nostrLoading } = useNostr();
  const { pubkey, getPublicKey, signEvent } = useIdentity();
  const { sendPayment } = usePayment();
  const canPost = hasWebln && hasNostr;
  const loadingCaps = weblnLoading || nostrLoading;

  const [listings, setListings] = useState<IListing[]>([]);
  const [mine, setMine] = useState<IListing[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [prices, setPrices] = useState({ postPriceSats: 500, bumpPriceSats: 100 });
  const [composer, setComposer] = useState<null | { editing?: IListing }>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    const q = filter ? `?category=${encodeURIComponent(filter)}` : '';
    const res = await fetch(`/api/listings${q}`);
    const data = await res.json();
    setListings(data.listings ?? []);
  }, [filter]);

  const loadMine = useCallback(async () => {
    if (!pubkey) return;
    try {
      const data = await authedFetch(signEvent, '/api/me', 'GET');
      setMine(data.listings ?? []);
    } catch {
      /* ignore */
    }
  }, [pubkey, signEvent]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    fetch('/api/config').then((r) => r.json()).then(setPrices).catch(() => {});
  }, []);

  async function payAndConfirm(paymentId: string, invoice: string) {
    setBusy('Waiting for payment…');
    const result = await sendPayment(invoice);
    setBusy('Confirming payment…');
    const ok = await confirmWithServer(paymentId, result?.preimage);
    setBusy(null);
    return ok;
  }

  async function submit(form: { category: string; title: string; body: string; priceSats: string; location: string }) {
    const payload = {
      category: form.category,
      title: form.title,
      body: form.body,
      priceSats: form.priceSats ? Number(form.priceSats) : null,
      location: form.location || null,
    };
    try {
      await getPublicKey();
      if (composer?.editing) {
        setBusy('Saving…');
        await authedFetch(signEvent, `/api/listings/${composer.editing.id}`, 'PATCH', payload);
        setBusy(null);
        flash('Listing updated');
      } else {
        setBusy('Creating invoice…');
        const r = await authedFetch(signEvent, '/api/listings', 'POST', payload);
        const ok = await payAndConfirm(r.paymentId, r.invoice);
        flash(ok ? 'Your listing is live 🎉' : 'Payment not confirmed. Your listing stays hidden until it is.');
      }
      setComposer(null);
      load();
      loadMine();
    } catch (e) {
      setBusy(null);
      flash(e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  async function bump(l: IListing) {
    try {
      setBusy('Creating invoice…');
      const r = await authedFetch(signEvent, `/api/listings/${l.id}/bump`, 'POST');
      const ok = await payAndConfirm(r.paymentId, r.invoice);
      flash(ok ? 'Bumped to the top' : 'Payment not confirmed');
      load();
    } catch (e) {
      setBusy(null);
      flash(e instanceof Error ? e.message : 'Bump failed');
    }
  }

  async function remove(l: IListing) {
    if (!confirm('Remove this listing?')) return;
    try {
      await authedFetch(signEvent, `/api/listings/${l.id}`, 'DELETE');
      flash('Removed');
      load();
      loadMine();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Remove failed');
    }
  }

  async function report(l: IListing) {
    if (!confirm('Report this listing as spam, scam or inappropriate?')) return;
    try {
      await getPublicKey();
      const r = await authedFetch(signEvent, `/api/listings/${l.id}/report`, 'POST', { reason: 'user report' });
      flash(r.hidden ? 'Thanks — listing hidden' : 'Thanks for reporting');
      load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Report failed');
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-xl px-4 pb-28">
      <header className="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b border-border bg-bg/95 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">{APP_NAME}</h1>
          <p className="text-xs text-text-muted">{APP_TAGLINE}</p>
        </div>
        {pubkey ? (
          <span className="rounded-full bg-accent-dim px-2 py-1 font-mono text-[10px] text-accent">{hexToNpub(pubkey).slice(0, 12)}…</span>
        ) : canPost ? (
          <button className="rounded-full border border-border px-3 py-1 text-xs" onClick={() => getPublicKey().then(loadMine)}>
            Connect
          </button>
        ) : null}
      </header>

      {!loadingCaps && !canPost && (
        <div role="status" className="mt-4 rounded-xl border border-accent/40 bg-accent-dim p-3 text-sm">
          <strong>Read-only.</strong> Open {APP_NAME} inside the <a className="underline" href="https://fedi.xyz/get-the-app">Fedi app</a> to post, bump or contact sellers with your Nostr identity.
        </div>
      )}

      <nav className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        {[{ id: '', label: 'All' }, ...CATEGORIES].map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${filter === c.id ? 'border-accent bg-accent text-bg' : 'border-border text-text-muted'}`}
          >
            {c.label}
          </button>
        ))}
      </nav>

      {mine.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 text-xs uppercase tracking-wide text-text-muted">Your listings</h2>
          {mine.map((l) => (
            <div key={l.id} className="mb-2 flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <span className="truncate">{l.title}</span>
              <span className="ml-2 shrink-0 text-xs text-text-muted">{l.status === 'live' ? 'Live' : 'Awaiting payment'}</span>
            </div>
          ))}
        </section>
      )}

      <section className="mt-5 space-y-3">
        {listings.length === 0 && <p className="py-10 text-center text-sm text-text-muted">No listings yet. Be the first to post.</p>}
        {listings.map((l) => (
          <ListingCard
            key={l.id}
            l={l}
            isMine={l.pubkey === pubkey}
            canAct={canPost}
            bumpPrice={prices.bumpPriceSats}
            onBump={() => bump(l)}
            onEdit={() => setComposer({ editing: l })}
            onRemove={() => remove(l)}
            onReport={() => report(l)}
          />
        ))}
      </section>

      {canPost && !composer && (
        <button
          onClick={() => setComposer({})}
          className="fixed inset-x-4 bottom-4 mx-auto max-w-xl rounded-xl bg-accent py-3 font-semibold text-bg shadow-lg"
        >
          Post a listing · {prices.postPriceSats} sats
        </button>
      )}

      {composer && (
        <Composer
          editing={composer.editing}
          price={prices.postPriceSats}
          onCancel={() => setComposer(null)}
          onSubmit={submit}
          busy={!!busy}
        />
      )}

      {(busy || toast) && (
        <div className="fixed inset-x-4 top-16 z-30 mx-auto max-w-md rounded-lg border border-border bg-surface-2 px-4 py-3 text-center text-sm shadow-lg">
          {busy ?? toast}
        </div>
      )}
    </div>
  );
}

function ListingCard(props: {
  l: IListing;
  isMine: boolean;
  canAct: boolean;
  bumpPrice: number;
  onBump: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onReport: () => void;
}) {
  const { l } = props;
  const npub = hexToNpub(l.pubkey);
  const [copied, setCopied] = useState(false);
  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-text-muted">{catLabel(l.category)}</span>
        <span className="text-[11px] text-text-subtle">{ago(l.bumpedAt)}</span>
      </div>
      <h3 className="mt-2 text-base font-semibold break-words">{l.title}</h3>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-text-muted">{l.body}</p>
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {l.priceSats != null && <span className="font-semibold text-accent">{l.priceSats.toLocaleString()} sats</span>}
        {l.location && <span className="text-text-muted">📍 {l.location}</span>}
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-xs">
        <code className="min-w-0 flex-1 truncate text-text-muted">{npub}</code>
        <button
          className="rounded border border-border px-2 py-1"
          onClick={async () => {
            await navigator.clipboard?.writeText(npub);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? 'Copied' : 'Copy npub'}
        </button>
        <a className="rounded border border-border px-2 py-1" href={`nostr:${npub}`}>
          Message
        </a>
      </div>
      {props.canAct && (
        <div className="mt-2 flex gap-2 text-xs">
          {props.isMine ? (
            <>
              <button className="rounded bg-accent-dim px-2 py-1 text-accent" onClick={props.onBump}>
                Bump · {props.bumpPrice} sats
              </button>
              <button className="rounded border border-border px-2 py-1" onClick={props.onEdit}>Edit</button>
              <button className="rounded border border-border px-2 py-1 text-destructive" onClick={props.onRemove}>Remove</button>
            </>
          ) : (
            <button className="ml-auto text-text-subtle underline" onClick={props.onReport}>Report</button>
          )}
        </div>
      )}
    </article>
  );
}

function Composer(props: {
  editing?: IListing;
  price: number;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (f: { category: string; title: string; body: string; priceSats: string; location: string }) => void;
}) {
  const e = props.editing;
  const [f, setF] = useState({
    category: e?.category ?? CATEGORIES[0].id,
    title: e?.title ?? '',
    body: e?.body ?? '',
    priceSats: e?.priceSats != null ? String(e.priceSats) : '',
    location: e?.location ?? '',
  });
  const input = 'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent';
  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/60" onClick={props.onCancel}>
      <form
        className="mx-auto max-h-[90dvh] w-full max-w-xl space-y-3 overflow-y-auto rounded-t-2xl border border-border bg-surface p-4"
        onClick={(ev) => ev.stopPropagation()}
        onSubmit={(ev) => {
          ev.preventDefault();
          props.onSubmit(f);
        }}
      >
        <h2 className="text-lg font-semibold">{e ? 'Edit listing' : 'New listing'}</h2>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => setF({ ...f, category: c.id })}
              className={`rounded-full border px-3 py-1 text-sm ${f.category === c.id ? 'border-accent bg-accent text-bg' : 'border-border'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <input className={input} placeholder="Title, e.g. Garden clean-up this Saturday" required maxLength={LIMITS.title} value={f.title} onChange={(ev) => setF({ ...f, title: ev.target.value })} />
        <textarea className={input} rows={4} placeholder="Details" required maxLength={LIMITS.body} value={f.body} onChange={(ev) => setF({ ...f, body: ev.target.value })} />
        <div className="flex gap-2">
          <input className={input} inputMode="numeric" pattern="[0-9]*" placeholder="Price in sats (optional)" value={f.priceSats} onChange={(ev) => setF({ ...f, priceSats: ev.target.value.replace(/\D/g, '') })} />
          <input className={input} placeholder="Area (optional)" maxLength={LIMITS.location} value={f.location} onChange={(ev) => setF({ ...f, location: ev.target.value })} />
        </div>
        <p className="text-xs text-text-muted">
          {e ? 'Edits are free.' : `Posting costs ${props.price} sats and stays up for 30 days. It goes live once the payment is confirmed.`} Buyers contact you via your Nostr npub.
        </p>
        <div className="flex gap-2">
          <button type="button" className="flex-1 rounded-lg border border-border py-2.5" onClick={props.onCancel}>Cancel</button>
          <button type="submit" disabled={props.busy} className="flex-[2] rounded-lg bg-accent py-2.5 font-semibold text-bg disabled:opacity-50">
            {e ? 'Save' : `Pay ${props.price} sats & post`}
          </button>
        </div>
      </form>
    </div>
  );
}
