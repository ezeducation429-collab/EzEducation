import { reviewedNote } from '@/lib/reviewed-note';
import { database, bucket } from '@/lib/storage';
import { isAdmin } from '@/lib/admin';
import { paidAccess, PaymentError, paymentFailure } from '@/lib/payments';
import { validateUUID, ValidationError } from '@/lib/validation';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const noteId = validateUUID(id, 'material ID');

    const note = await database()
      .prepare('SELECT file_key, title, price_paise FROM notes WHERE id=?')
      .bind(noteId)
      .first<{ file_key: string | null; title: string; price_paise: number }>();

    if (!note?.file_key) {
      return new Response('File not found', { status: 404 });
    }

    if (note.price_paise > 0 && !(await isAdmin()) && !(await paidAccess(noteId))) {
      return Response.json(
        { error: 'Payment required to download this premium study material.' },
        { status: 402, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const reviewed = reviewedNote(noteId, note.file_key);
    const file = reviewed ?? (await bucket().get(note.file_key));

    if (!file) {
      return new Response('File not found', { status: 404 });
    }

    return new Response(file.body as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Ez-Education-${noteId.slice(0, 8)}.pdf"; filename*=UTF-8''${encodeURIComponent(note.title + '.pdf')}`,
        'X-Content-Type-Options': 'nosniff',
        ...(reviewed ? { 'X-Ez-Content-Revision': reviewed.date } : {}),
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    if (e instanceof ValidationError) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof PaymentError) {
      return paymentFailure(e);
    }
    console.error('Download PDF error:', e);
    return new Response('The PDF is temporarily unavailable. Please try again.', { status: 503 });
  }
}
