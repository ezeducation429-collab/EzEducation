import { sameOrigin, isAdmin } from '@/lib/admin';
import { database } from '@/lib/storage';
import {
  buyerHash,
  requireConfig,
  razorpay,
  paymentFailure,
  PaymentError,
} from '@/lib/payments';
import { validateUUID, ValidationError } from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET() {
  try {
    const buyer = await buyerHash();
    if (!buyer) {
      return Response.json([], { headers: { 'Cache-Control': 'no-store' } });
    }
    const result = await database()
      .prepare(
        'SELECT o.id,o.note_id,o.status,o.payment_id,o.amount,n.title FROM note_orders o JOIN notes n ON n.id=o.note_id WHERE o.buyer_hash=? ORDER BY o.created_at DESC LIMIT 100'
      )
      .bind(buyer)
      .all();
    return Response.json(result.results, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return paymentFailure(e);
  }
}

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) {
      throw new PaymentError('Invalid request origin.', 403);
    }

    // IP Rate Limiting: 10 checkouts / min
    const clientIp = getClientIp(req);
    const limit = checkRateLimit(`checkout-order:${clientIp}`, 10, 60000);
    if (!limit.allowed) {
      throw new PaymentError(
        `Too many checkout attempts. Please wait ${limit.resetSeconds} seconds before trying again.`,
        429
      );
    }

    const body = (await req.json()) as { noteId?: unknown };
    const noteId = validateUUID(body.noteId, 'study material ID');

    const note = await database()
      .prepare('SELECT id,title,price_paise,file_key FROM notes WHERE id=?')
      .bind(noteId)
      .first<{ id: string; title: string; price_paise: number; file_key: string | null }>();

    if (!note?.file_key) {
      throw new PaymentError('This PDF study material is currently unavailable.', 404);
    }
    if (!note.price_paise) {
      throw new PaymentError('This study material is free. Use the direct Download button.', 400);
    }

    const config = await requireConfig();
    const isLocalhost = req.headers.get('host')?.includes('localhost') || req.headers.get('host')?.includes('127.0.0.1');
    if (config.keyId.startsWith('rzp_test_') && !isLocalhost && !(await isAdmin())) {
      throw new PaymentError(
        'Payments are currently running in test mode. Please contact Ez Education to purchase.',
        503
      );
    }

    const buyer = await buyerHash(true);

    // Limit buyer checkouts: max 5 per minute
    const recent = await database()
      .prepare('SELECT COUNT(*) AS count FROM note_orders WHERE buyer_hash=? AND created_at>?')
      .bind(buyer, new Date(Date.now() - 60000).toISOString())
      .first<{ count: number }>();

    if ((recent?.count || 0) >= 5) {
      throw new PaymentError('Please wait a minute before creating another checkout order.', 429);
    }

    const order = await razorpay(config, 'orders', {
      amount: note.price_paise,
      currency: 'INR',
      receipt: crypto.randomUUID(),
      notes: { note_id: note.id },
    });

    if (
      typeof order.id !== 'string' ||
      order.amount !== note.price_paise ||
      order.currency !== 'INR'
    ) {
      throw new PaymentError('Could not create a valid Razorpay order.', 502);
    }

    await database()
      .prepare(
        'INSERT INTO note_orders (id,note_id,buyer_hash,amount,key_id,status,created_at) VALUES (?,?,?,?,?,?,?)'
      )
      .bind(
        order.id,
        note.id,
        buyer,
        note.price_paise,
        config.keyId,
        'created',
        new Date().toISOString()
      )
      .run();

    return Response.json(
      {
        orderId: order.id,
        amount: note.price_paise,
        keyId: config.keyId,
        title: note.title,
        mode: config.keyId.startsWith('rzp_live_') ? 'live' : 'test',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    if (e instanceof ValidationError) {
      return Response.json({ error: e.message, field: e.field }, { status: e.status });
    }
    return paymentFailure(e);
  }
}
