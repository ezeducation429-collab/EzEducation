import { sameOrigin } from '@/lib/admin';
import { database } from '@/lib/storage';
import {
  buyerHash,
  requireConfig,
  hmac,
  equalHex,
  verifyCaptured,
  paymentFailure,
  PaymentError,
  Order,
  razorpay,
} from '@/lib/payments';

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) {
      throw new PaymentError('Invalid request origin.', 403);
    }

    const data = (await req.json()) as Record<string, unknown>;
    const orderId = String(data.razorpay_order_id || '').trim();

    if (!/^order_[A-Za-z0-9]{5,80}$/.test(orderId)) {
      throw new PaymentError('Invalid Razorpay order reference format.', 400);
    }

    const buyer = await buyerHash();
    if (!buyer) {
      throw new PaymentError(
        'Please sign in to the student account used during checkout to verify your purchase.',
        403
      );
    }

    const order = await database()
      .prepare('SELECT * FROM note_orders WHERE id=? AND buyer_hash=?')
      .bind(orderId, buyer)
      .first<Order>();

    if (!order) {
      throw new PaymentError('This order was not found for your active student session.', 404);
    }

    const config = await requireConfig();
    let paymentId: string;

    if (data.razorpay_payment_id) {
      paymentId = String(data.razorpay_payment_id).trim();
      const signature = String(data.razorpay_signature || '').trim();

      if (!/^pay_[A-Za-z0-9]{5,80}$/.test(paymentId)) {
        throw new PaymentError('Invalid Razorpay payment identifier format.', 400);
      }
      if (!signature) {
        throw new PaymentError('Payment signature is missing.', 400);
      }

      const expectedSig = await hmac(config.keySecret, `${order.id}|${paymentId}`);
      if (!equalHex(expectedSig, signature)) {
        throw new PaymentError('Payment authenticity verification failed (invalid signature).', 403);
      }
    } else {
      // Direct Razorpay status verification
      const response = await razorpay(config, `orders/${encodeURIComponent(order.id)}/payments`);
      const payments = response.items as Record<string, unknown>[] | undefined;
      const captured = payments?.find(
        (p) => p.status === 'captured' && Number(p.amount_refunded || 0) === 0
      );

      if (!captured || typeof captured.id !== 'string') {
        throw new PaymentError(
          'Payment has not been captured yet. If funds were debited, please wait a moment and verify again.',
          409
        );
      }
      paymentId = captured.id;
    }

    await verifyCaptured(config, order, paymentId);

    await database()
      .prepare("UPDATE note_orders SET payment_id=?,status='paid' WHERE id=? AND buyer_hash=?")
      .bind(paymentId, order.id, buyer)
      .run();

    return Response.json(
      {
        downloadUrl: `/api/notes/${encodeURIComponent(order.note_id)}/file`,
        paymentId,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    return paymentFailure(e);
  }
}
