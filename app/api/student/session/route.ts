import { sameOrigin } from '@/lib/admin';
import {
  studentUser,
  studentSignup,
  studentLogin,
  setStudentSession,
  clearStudentSession,
  StudentAuthError,
  studentBuyerHash,
} from '@/lib/firebase-auth';
import { legacyBuyerHash } from '@/lib/payments';
import { database } from '@/lib/storage';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { validateEmail, validatePassword } from '@/lib/validation';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  return Response.json({ user: await studentUser() }, { headers });
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  await clearStudentSession();
  return Response.json({ ok: true }, { headers });
}

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return Response.json({ error: 'Invalid origin' }, { status: 403 });

    // Rate limiting: 10 attempts per minute per IP
    const clientIp = getClientIp(req);
    const limit = checkRateLimit(`student-auth:${clientIp}`, 10, 60000);
    if (!limit.allowed) {
      throw new StudentAuthError(`Too many attempts. Please wait ${limit.resetSeconds} seconds before retrying.`, 429);
    }

    if (Number(req.headers.get('content-length') || 0) > 4096) {
      throw new StudentAuthError('Request payload too large.');
    }

    const data = (await req.json()) as Record<string, unknown>;
    const { action } = data;
    if (!['login', 'signup', 'reset'].includes(String(action))) {
      throw new StudentAuthError('Invalid authentication action.');
    }

    let email = '';
    try {
      email = validateEmail(data.email);
    } catch (err) {
      throw new StudentAuthError(err instanceof Error ? err.message : 'Invalid email address.', 400);
    }

    if (action === 'reset') {
      return Response.json(
        { message: 'If this email has an account, a password reset link has been sent.' },
        { headers }
      );
    }

    let password = '';
    try {
      password = validatePassword(data.password, action === 'signup');
    } catch (err) {
      throw new StudentAuthError(err instanceof Error ? err.message : 'Invalid password.', 400);
    }

    let result: { idToken: string; localId: string; email: string };
    if (action === 'signup') {
      result = await studentSignup(email, password);
    } else {
      result = await studentLogin(email, password);
    }

    if (data.linkPurchases === true) {
      const legacy = await legacyBuyerHash();
      if (legacy) {
        await database()
          .prepare('UPDATE note_orders SET buyer_hash=? WHERE buyer_hash=?')
          .bind(await studentBuyerHash(result.localId), legacy)
          .run();
      }
    }

    const isHttps = req.headers.get('x-forwarded-proto') === 'https' || new URL(req.url).protocol === 'https:';
    await setStudentSession(result.idToken, isHttps);
    return Response.json({ user: { email: result.email } }, { headers });
  } catch (e) {
    return Response.json(
      { error: e instanceof StudentAuthError ? e.message : 'Could not complete the request. Please try again.' },
      { status: e instanceof StudentAuthError ? e.status : 503, headers }
    );
  }
}
