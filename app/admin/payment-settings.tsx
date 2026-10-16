'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CreditCard, ShieldCheck, Key, AlertCircle, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react';

export default function PaymentSettings() {
  const [config, setConfig] = useState<{ configured: boolean; keyId: string; mode: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/admin/payments')
      .then(async (r) => {
        const d = (await r.json()) as { configured: boolean; keyId: string; mode: string; error?: string };
        if (!r.ok) throw new Error(d.error);
        setConfig(d);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const data = new FormData(form);
      const r = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyId: data.get('keyId'),
          keySecret: data.get('keySecret'),
        }),
      });
      const d = (await r.json()) as { configured: boolean; keyId: string; mode: string; error?: string };
      if (!r.ok) throw new Error(d.error || 'Failed to connect Razorpay account.');
      setConfig(d);
      form.reset();
      setSuccess(
        d.mode === 'live'
          ? 'Razorpay connected in Live Mode! You can now accept real student payments for premium PDFs.'
          : 'Razorpay connected in Test Mode. You can test purchases without making real transactions.'
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect Razorpay.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Razorpay Payment Gateway</h3>
            <p className="text-xs text-slate-500">Configure your Razorpay API keys to sell premium study notes.</p>
          </div>
        </div>

        {config && (
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              config.configured
                ? config.mode === 'live'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>
              {config.configured
                ? config.mode === 'live'
                  ? 'Live Mode Active'
                  : `Test Mode (${config.keyId})`
                : 'Not Configured'}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="keyId" className="block text-xs font-semibold text-slate-700">
                Razorpay Key ID
              </label>
              <input
                id="keyId"
                name="keyId"
                required
                placeholder="rzp_test_... or rzp_live_..."
                autoComplete="off"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label htmlFor="keySecret" className="block text-xs font-semibold text-slate-700">
                Razorpay Key Secret
              </label>
              <input
                id="keySecret"
                name="keySecret"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Enter your matching Razorpay secret"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500">
            Keys are available in your Razorpay Dashboard → Account & Settings → API Keys. Enable auto-capture on your Razorpay dashboard. Key secrets are securely stored on the server and are never exposed in client bundles.
          </p>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
          >
            {busy && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            {busy ? 'Verifying with Razorpay…' : config?.configured ? 'Update Razorpay API Keys' : 'Connect Razorpay Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
