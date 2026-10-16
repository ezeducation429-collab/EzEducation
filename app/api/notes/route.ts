import { publicNotes } from '@/lib/public-notes';
import { database, bucket } from '@/lib/storage';
import { isAdmin, sameOrigin } from '@/lib/admin';
import { paymentFailure, PaymentError } from '@/lib/payments';
import {
  ValidationError,
  validateString,
  validateCourseAndSemester,
  validateMaterialKind,
  validatePriceInput,
  validatePdfFile,
  validatePublicHttpsUrl,
} from '@/lib/validation';

export async function GET() {
  try {
    return Response.json(await publicNotes(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    console.error('Load notes error:', e);
    return Response.json(
      { error: 'Study material is temporarily unavailable. Please try again.' },
      { status: 503 }
    );
  }
}

export async function POST(req: Request) {
  let fileKey: string | null = null;
  try {
    if (!sameOrigin(req) || !(await isAdmin())) {
      return Response.json(
        { error: 'Educator access required. Please unlock the educator panel.' },
        { status: 403 }
      );
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 22 * 1024 * 1024) {
      return Response.json(
        { error: 'Upload payload too large. Maximum PDF size is 20 MB.' },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const field = (k: string) => String(form.get(k) || '').trim();

    // 1. Validate Course & Semester
    const { course, semester } = validateCourseAndSemester(
      field('course') || 'bpharm',
      field('semester')
    );

    // 2. Validate Material Kind
    const kind = validateMaterialKind(field('kind') || 'Notes');

    // 3. Validate Title & Subject
    const title = validateString(field('title'), 'Document title', 2, 160);
    const subject = validateString(field('subject'), 'Subject name', 2, 160);

    // 4. Validate Unit
    const rawUnit = field('unit');
    const unit = rawUnit ? validateString(rawUnit, 'Unit / Chapter', 1, 80) : '';

    // 5. Validate Price
    const price = validatePriceInput(field('price') || '0');

    // 6. Validate File or HTTPS Link
    const file = form.get('file');
    const id = crypto.randomUUID();

    if (file instanceof File && file.size > 0) {
      const { buffer } = await validatePdfFile(file, 20 * 1024 * 1024);
      fileKey = `notes/${id}.pdf`;
      await bucket().put(fileKey, buffer, {
        httpMetadata: { contentType: 'application/pdf' },
      });
    } else {
      if (price > 0) {
        throw new ValidationError(
          'Paid study materials require an uploaded PDF file. External web links cannot be payment protected.',
          400,
          'file'
        );
      }
      const rawUrl = field('url');
      if (!rawUrl) {
        throw new ValidationError(
          'Please upload a PDF file or provide a shareable HTTPS link.',
          400,
          'url'
        );
      }
      validatePublicHttpsUrl(rawUrl, 'Shareable link');
    }

    const now = new Date().toISOString();
    await database()
      .prepare(
        'INSERT INTO notes (id, course, semester, subject, title, unit, kind, url, file_key, price_paise, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
      )
      .bind(
        id,
        course,
        semester,
        subject,
        title,
        unit,
        kind,
        fileKey ? '' : field('url'),
        fileKey,
        price,
        now
      )
      .run();

    return Response.json({ id }, { status: 201 });
  } catch (e) {
    if (fileKey) {
      try {
        await bucket().delete(fileKey);
      } catch (cleanupErr) {
        console.error('Failed to cleanup orphaned PDF upload:', cleanupErr);
      }
    }

    if (e instanceof ValidationError) {
      return Response.json({ error: e.message, field: e.field }, { status: e.status });
    }
    if (e instanceof PaymentError) {
      return paymentFailure(e);
    }

    console.error('Save note error:', e);
    return Response.json(
      { error: 'The material could not be saved. Please verify your inputs and try again.' },
      { status: 503 }
    );
  }
}
