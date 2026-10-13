import {cookies} from 'next/headers';
export const firebaseProject='ez-education-19959';
const apiKey='AIzaSyCeMF1gjj3_oHj1K98VZ_rQe93ESNyPdgQ';
const cookieName='__Host-ez_student';
export class StudentAuthError extends Error {constructor(message:string,public status=400){super(message)}}
export async function firebaseAuth(method:string,body:unknown){
 const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const data=await r.json() as Record<string,any>;
 if(!r.ok){const code=String(data.error?.message||'');const message=code.includes('OPERATION_NOT_ALLOWED')||code.includes('CONFIGURATION_NOT_FOUND')?'Email/password sign-in needs to be enabled in Firebase Console → Authentication → Sign-in method.':code.includes('TOO_MANY_ATTEMPTS')?'Too many attempts. Please wait and try again.':code.includes('EMAIL_EXISTS')?'An account already exists for this email. Sign in instead.':code.includes('WEAK_PASSWORD')?'Use a stronger password with at least 8 characters.':code.includes('INVALID_PASSWORD')||code.includes('INVALID_LOGIN_CREDENTIALS')||code.includes('EMAIL_NOT_FOUND')?'Email or password is incorrect.':code.includes('INVALID_EMAIL')?'Enter a valid email address.':'Sign-in is unavailable or your session expired. Please sign in again.';throw new StudentAuthError(message,code.includes('TOO_MANY_ATTEMPTS')?429:400)}
 return data;
}
export async function setStudentSession(token:string){(await cookies()).set(cookieName,token,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:3600})}
export async function clearStudentSession(){(await cookies()).set(cookieName,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0})}
export async function studentUser(){
 const token=(await cookies()).get(cookieName)?.value;if(!token)return null;
 try{const data=await firebaseAuth('lookup',{idToken:token});const user=data.users?.[0];if(!user?.localId||user.disabled)return null;
 const payload=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
 if(payload.aud!==firebaseProject||payload.iss!==`https://securetoken.google.com/${firebaseProject}`||payload.sub!==user.localId||payload.exp*1000<=Date.now())return null;
 return {uid:String(user.localId),email:String(user.email||'')};
 }catch{return null}
}
export async function studentBuyerHash(uid:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`firebase:${firebaseProject}:${uid}`)))).map(x=>x.toString(16).padStart(2,'0')).join('')}
