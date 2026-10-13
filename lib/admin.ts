import {cookies} from 'next/headers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {adminSecret} from './storage';
export const COOKIE='ez_educator';
export async function signature(value:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(adminSecret()),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('')}
export async function isAdmin(){if(!adminSecret())return false;const value=(await cookies()).get(COOKIE)?.value;if(!value)return false;const [expiry,sig]=value.split('.');if(!expiry||!sig||Number(expiry)<Date.now())return false;const user=await getChatGPTUser();if(user&&sig===await signature(`${user.userId}:${expiry}`))return true;return sig===await signature(`educator:${expiry}`)}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');return !!origin&&origin===new URL(req.url).origin}
export async function keyMatches(input:string){if(!adminSecret()||input.length>200)return false;const digest=async(s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));const [a,b]=await Promise.all([digest(input),digest(adminSecret())]);let different=0;for(let i=0;i<a.length;i++)different|=a[i]^b[i];return different===0}
