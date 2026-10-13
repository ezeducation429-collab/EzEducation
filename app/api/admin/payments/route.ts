import { isAdmin, sameOrigin } from '@/lib/admin';
import { database } from '@/lib/storage';
import { encryptConfig, paymentConfig, paymentFailure, PaymentError, razorpay } from '@/lib/payments';

export async function GET() {
    try {
        if (!await isAdmin()) return Response.json({ error: 'Educator access required.' }, { status: 403 });
        const config = await paymentConfig();
        return Response.json({
            configured: !!config,
            keyId: config?.keyId || '',
            mode: config?.keyId.startsWith('rzp_live_') ? 'live' : 'test'
        }, { headers: { 'Cache-Control': 'no-store' } })
    } catch (e) { return paymentFailure(e) }
}

export async function POST(req: Request) {
    try {
        if (!sameOrigin(req) || !await isAdmin()) return Response.json({ error: 'Educator access required.' }, { status: 403 });
        const data = await req.json() as Record<string, unknown>;
        const keyId = String(data.keyId || '').trim();
        const keySecret = String(data.keySecret || '').trim();
        if (!/^rzp_(test|live)_[A-Za-z0-9]{8,80}$/.test(keyId) || !keySecret || keySecret.length > 200) throw new PaymentError('Enter a valid Razorpay Key ID and Key Secret.');
        const config = { keyId, keySecret };
        await razorpay(config, 'orders?count=1');
        const encrypted = await encryptConfig(config);
        await database().prepare('INSERT INTO payment_settings (id,encrypted_credentials) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET encrypted_credentials=excluded.encrypted_credentials').bind('razorpay', encrypted).run();
        return Response.json({ configured: true, keyId, mode: keyId.startsWith('rzp_live_') ? 'live' : 'test' })
    } catch (e) { return paymentFailure(e) }
}
