import {sameOrigin} from '@/lib/admin';
import {firebaseAuth,studentUser,setStudentSession,clearStudentSession,StudentAuthError,studentBuyerHash} from '@/lib/firebase-auth';
import {legacyBuyerHash} from '@/lib/payments';
import {database} from '@/lib/storage';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){return Response.json({user:await studentUser()},{headers})}
export async function DELETE(req:Request){if(!sameOrigin(req))return Response.json({error:'Invalid origin'},{status:403});await clearStudentSession();return Response.json({ok:true},{headers})}
export async function POST(req:Request){try{
 if(!sameOrigin(req))return Response.json({error:'Invalid origin'},{status:403});
 if(Number(req.headers.get('content-length')||0)>4096)throw new StudentAuthError('Request too large.');
 const data=await req.json() as Record<string,unknown>;const {action}=data;
 if(!['login','signup','reset'].includes(String(action)))throw new StudentAuthError('Invalid action.');
 const email=typeof data.email==='string'?data.email.trim():'';const password=typeof data.password==='string'?data.password:'';
 if(!email||email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw new StudentAuthError('Enter a valid email address.');
 if(action==='reset'){try{await firebaseAuth('sendOobCode',{requestType:'PASSWORD_RESET',email})}catch(e){if(!(e instanceof StudentAuthError)||!e.message.includes('incorrect'))throw e}return Response.json({message:'If this email has an account, a password reset email has been sent.'},{headers})}
 if(!password||password.length>128||(action==='signup'&&password.length<8))throw new StudentAuthError('Use a password with 8–128 characters.');
 const result=await firebaseAuth(action==='signup'?'signUp':'signInWithPassword',{email,password,returnSecureToken:true});
 if(typeof result.idToken!=='string'||typeof result.localId!=='string')throw new StudentAuthError('Could not create a session.');
 if(data.linkPurchases===true){const legacy=await legacyBuyerHash();if(legacy)await database().prepare('UPDATE note_orders SET buyer_hash=? WHERE buyer_hash=?').bind(await studentBuyerHash(result.localId),legacy).run()}
 await setStudentSession(result.idToken);return Response.json({user:{email:result.email}},{headers});
 }catch(e){return Response.json({error:e instanceof StudentAuthError?e.message:'Could not complete the request. Please try again.'},{status:e instanceof StudentAuthError?e.status:503,headers})}}
