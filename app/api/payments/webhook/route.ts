import { headers } from 'next/headers';
import { database } from '@/lib/storage';
import { hmac, equalHex } from '@/lib/payments';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const headerList = await headers();
    const signature = headerList.get('x-razorpay-signature');

    // Prefer dedicated webhook secret, fall back to key secret if configured
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!secret || !signature) {
      console.warn('Razorpay webhook received without secret or signature');
      return Response.json({ error: 'Webhook signature or secret missing' }, { status: 400 });
    }

    const expectedSignature = await hmac(secret, rawBody);
    if (!equalHex(expectedSignature, signature)) {
      console.warn('Razorpay webhook invalid signature');
      return Response.json({ error: 'Invalid webhook signature' }, { status: 403 });
    }

    const event = JSON.parse(rawBody) as {
      event: string;
      payload?: {
        payment?: { entity?: { id: string; order_id: string; status: string; amount: number } };
        order?: { entity?: { id: string; status: string; amount: number } };
      };
    };

    if (event.event === 'order.paid' || event.event === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;
      const paymentId = paymentEntity?.id;

      if (orderId && paymentId) {
        // Idempotent update: mark order as paid
        await database()
          .prepare("UPDATE note_orders SET payment_id=?, status='paid' WHERE id=? AND (status != 'paid' OR payment_id IS NULL)")
          .bind(paymentId, orderId)
          .run();
        console.log(`Razorpay webhook: Order ${orderId} marked as paid via ${paymentId}`);
      }
    }

    return Response.json({ status: 'ok', received: true });
  } catch (error) {
    console.error('Razorpay webhook processing error:', error);
    return Response.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
