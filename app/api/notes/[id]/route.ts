import {database, bucket} from '@/lib/storage';
import {isAdmin, sameOrigin} from '@/lib/admin';
import {pricePaise,paymentFailure,PaymentError} from '@/lib/payments';

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    if(!sameOrigin(req)||!await isAdmin())return Response.json({error:'Educator access required.'},{status:403});
    const {id}=await params;const data=await req.json() as Record<string,unknown>;
    const subject=String(data.subject||'').trim(),unit=String(data.unit||'').trim();
    if(!subject||subject.length>160||unit.length>80)throw new PaymentError('Enter a subject and a unit of up to 80 characters.');
    const price=pricePaise(String(data.price??''));
    const note=await database().prepare('SELECT file_key FROM notes WHERE id=?').bind(id).first<{file_key:string|null}>();
    if(!note)throw new PaymentError('Material not found.',404);
    if(price>0&&!note.file_key)throw new PaymentError('Upload a PDF to sell it. Public links must remain free.');
    await database().prepare('UPDATE notes SET subject=?,unit=?,price_paise=? WHERE id=?').bind(subject,unit,price,id).run();
    return Response.json({updated:true});
  }catch(e){return paymentFailure(e)}
}

export async function DELETE(req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    if (!sameOrigin(req) || !await isAdmin()) {
      return Response.json({error: 'Educator access required. Please unlock the panel again.'}, {status: 403});
    }
    const {id} = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return Response.json({error: 'Invalid material ID.'}, {status: 400});
    }
    // Keep the file key available on retries, including after a storage failure.
    const note = await database().prepare('SELECT file_key FROM notes WHERE id=?').bind(id).first<{file_key: string | null}>();
    if (!note) return new Response(null, {status: 204});
    if (note.file_key) await bucket().delete(note.file_key);
    await database().prepare('DELETE FROM notes WHERE id=?').bind(id).run();
    return new Response(null, {status: 204});
  } catch (error) {
    console.error('Delete note', error);
    return Response.json({error: 'Deletion could not be completed. Please try again.'}, {status: 503});
  }
}
