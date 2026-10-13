import {cookies} from 'next/headers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {COOKIE,isAdmin,keyMatches,sameOrigin,signature} from '@/lib/admin';

export async function GET(){
  return Response.json({authenticated:await isAdmin()},{headers:{'Cache-Control':'no-store'}});
}

export async function POST(req:Request){
  try{
    if(!sameOrigin(req))return Response.json({error:'Request not allowed'},{status:403});
    const {key}=await req.json() as {key?:unknown};
    if(typeof key!=='string'||!await keyMatches(key))return Response.json({error:'The educator key is incorrect.'},{status:401});
    const user=await getChatGPTUser();
    const tokenTarget=user?user.userId:'educator';
    const expiry=String(Date.now()+8*60*60*1000);
    (await cookies()).set(COOKIE,`${expiry}.${await signature(`${tokenTarget}:${expiry}`)}`,{httpOnly:true,secure:new URL(req.url).protocol==='https:',sameSite:'strict',path:'/',maxAge:8*60*60});
    return Response.json({ok:true});
  }catch(e){
    console.error('Admin login',e);
    return Response.json({error:'Sign-in is unavailable. Please try again.'},{status:503});
  }
}

export async function DELETE(req:Request){
  if(!sameOrigin(req))return Response.json({error:'Request not allowed'},{status:403});
  (await cookies()).delete(COOKIE);
  return Response.json({ok:true});
}
