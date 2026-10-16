'use client';

import { FormEvent, useState } from 'react';
import { Edit3, Check, X, RefreshCw, AlertCircle } from 'lucide-react';
import type { Note } from '../study-library';

export default function NoteEditor({ note, onSaved }: { note: Note; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const data = new FormData(e.currentTarget);
    const subject = String(data.get('subject') || '').trim();
    const unit = String(data.get('unit') || '').trim();
    const priceVal = Number(data.get('price') || 0);

    if (!subject || subject.length < 2) {
      setError('Please enter a subject name (at least 2 characters).');
      return;
    }
    if (subject.length > 160) {
      setError('Subject name cannot exceed 160 characters.');
      return;
    }
    if (unit.length > 80) {
      setError('Unit name cannot exceed 80 characters.');
      return;
    }
    if (isNaN(priceVal) || priceVal < 0) {
      setError('Please enter a valid price of ₹0 or greater.');
      return;
    }
    if (priceVal > 0 && priceVal < 1) {
      setError('Paid PDFs must cost at least ₹1.00. Use 0 for free.');
      return;
    }
    if (priceVal > 0 && !note.file_key) {
      setError('External web links cannot be paid. Upload a PDF to sell it.');
      return;
    }

    setBusy(true);
    try {
      const r = await fetch('/api/notes/' + encodeURIComponent(note.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          unit,
          price: data.get('price'),
        }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(d.error || 'Could not update note.');
      await onSaved();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save modifications.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
      >
        <Edit3 className="h-3 w-3" />
        {open ? 'Cancel Edit' : 'Edit Details & Price'}
      </button>

      {open && (
        <form
          onSubmit={save}
          className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 transition-all"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700">Subject</label>
              <input
                name="subject"
                required
                maxLength={160}
                defaultValue={note.subject}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700">Unit / Chapter</label>
              <input
                name="unit"
                maxLength={80}
                defaultValue={note.unit}
                placeholder="e.g. Unit 1"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700">Price (₹)</label>
              <input
                name="price"
                type="number"
                required
                min="0"
                max="99999.99"
                step="0.01"
                defaultValue={note.price_paise / 100}
                readOnly={!note.file_key}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none read-only:bg-slate-100"
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-500">
            {note.file_key
              ? 'Set ₹0 for free access, or ₹1+ for paid PDF download via Razorpay.'
              : 'External web links are always free.'}
          </p>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              {busy ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
