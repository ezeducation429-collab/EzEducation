import { database, bucket } from '@/lib/storage';
import { isAdmin, sameOrigin } from '@/lib/admin';
import { paymentFailure, PaymentError } from '@/lib/payments';
import {
  ValidationError,
  validateUUID,
  validateString,
  validatePriceInput,
} from '@/lib/validation';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!sameOrigin(req) || !(await isAdmin())) {
      return Response.json({ error: 'Educator access required.' }, { status: 403 });
    }

    const { id } = await params;
    const noteId = validateUUID(id, 'material ID');

    const data = (await req.json()) as Record<string, unknown>;
    const subject = validateString(data.subject, 'Subject name', 2, 160);

    const rawUnit = data.unit !== undefined && data.unit !== null ? String(data.unit).trim() : '';
    const unit = rawUnit ? validateString(rawUnit, 'Unit / Chapter', 1, 80) : '';

    const price = validatePriceInput(data.price);

    const note = await database()
      .prepare('SELECT file_key FROM notes WHERE id=?')
      .bind(noteId)
      .first<{ file_key: string | null }>();

    if (!note) {
      return Response.json({ error: 'Study material not found.' }, { status: 404 });
    }

    if (price > 0 && !note.file_key) {
      throw new ValidationError(
        'Upload a PDF file to charge for it. Public external links must remain free.',
        400,
        'price'
      );
    }

    await database()
      .prepare('UPDATE notes SET subject=?,unit=?,price_paise=? WHERE id=?')
      .bind(subject, unit, price, noteId)
      .run();

    return Response.json({ updated: true });
  } catch (e) {
    if (e instanceof ValidationError) {
      return Response.json({ error: e.message, field: e.field }, { status: e.status });
    }
    if (e instanceof PaymentError) {
      return paymentFailure(e);
    }
    console.error('Update note error:', e);
    return Response.json({ error: 'Could not update study material.' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!sameOrigin(req) || !(await isAdmin())) {
      return Response.json(
        { error: 'Educator access required. Please unlock the panel again.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const noteId = validateUUID(id, 'material ID');

    const note = await database()
      .prepare('SELECT file_key FROM notes WHERE id=?')
      .bind(noteId)
      .first<{ file_key: string | null }>();

    if (!note) return new Response(null, { status: 204 });

    if (note.file_key) {
      try {
        await bucket().delete(note.file_key);
      } catch (err) {
        console.error('Failed to delete S3/R2 file for note:', err);
      }
    }

    await database().prepare('DELETE FROM notes WHERE id=?').bind(noteId).run();
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Delete note error:', error);
    return Response.json(
      { error: 'Deletion could not be completed. Please try again.' },
      { status: 503 }
    );
  }
}
