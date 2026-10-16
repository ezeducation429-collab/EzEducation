import { isAdmin, sameOrigin } from '@/lib/admin';
import { database } from '@/lib/storage';
import { encryptConfig, paymentConfig, paymentFailure, PaymentError, razorpay } from '@/lib/payments';
import { validateRazorpayCredentials, ValidationError } from '@/lib/validation';

export async function GET() {
  try {
    if (!(await isAdmin())) {
      return Response.json({ error: 'Educator access required.' }, { status: 403 });
    }
    const config = await paymentConfig();
    return Response.json(
      {
        configured: !!config,
        keyId: config?.keyId || '',
        mode: config?.keyId.startsWith('rzp_live_') ? 'live' : 'test',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    return paymentFailure(e);
  }
}

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req) || !(await isAdmin())) {
      return Response.json({ error: 'Educator access required.' }, { status: 403 });
    }

    const data = await req.json();
    const { keyId, keySecret } = validateRazorpayCredentials(data);

    const config = { keyId, keySecret };
    // Verify credentials against Razorpay API before saving
    await razorpay(config, 'orders?count=1');

    const encrypted = await encryptConfig(config);
    await database()
      .prepare(
        'INSERT INTO payment_settings (id,encrypted_credentials) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET encrypted_credentials=excluded.encrypted_credentials'
      )
      .bind('razorpay', encrypted)
      .run();

    return Response.json({
      configured: true,
      keyId,
      mode: keyId.startsWith('rzp_live_') ? 'live' : 'test',
    });
  } catch (e) {
    if (e instanceof ValidationError) {
      return Response.json({ error: e.message, field: e.field }, { status: e.status });
    }
    return paymentFailure(e);
  }
}
