// Isolate Workers/cookie/database boundaries while exercising the actual routes.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const state={cookie:undefined,admin:false,origin:true,paymentStatus:'captured',refunded:0,paymentAmount:2500,currency:'INR',paymentOrder:'order_test12345',order:null,config:null,bucketReads:0};
const note={id:'note-test',title:'Test PDF',price_paise:2500,file_key:'notes/test.pdf'};
const cookieStore={get:()=>state.cookie?{value:state.cookie}:undefined,set:(_name,value)=>{state.cookie=value}};
const db={prepare(sql){let args=[];return {bind(...values){args=values;return this},async first(){if(sql.includes('encrypted_credentials'))return state.config?{encrypted_credentials:state.config}:null;if(sql.includes('COUNT(*)'))return {count:0};if(sql.includes('FROM notes'))return args[0]===note.id?note:null;if(sql.includes('FROM note_orders'))return state.order&&args[0]===state.order.id&&args[1]===state.order.buyer_hash?state.order:null;return null},async all(){if(sql.includes('note_orders'))return {results:state.order&&state.order.buyer_hash===args[0]&&state.order.note_id===args[1]&&state.order.status==='paid'?[state.order]:[]};return {results:[]}},async run(){if(sql.startsWith('INSERT INTO note_orders'))state.order={id:args[0],note_id:args[1],buyer_hash:args[2],amount:args[3],key_id:args[4],status:args[5],created_at:args[6],payment_id:null};if(sql.startsWith('UPDATE note_orders')){assert.equal(args[1],state.order.id);assert.equal(args[2],state.order.buyer_hash);state.order.payment_id=args[0];state.order.status='paid'}return {success:true}}}}};
globalThis.__paymentTest={env:{},cookies:async()=>cookieStore,adminSecret:()=> 'local-test-admin-key',database:()=>db,bucket:()=>({get:async()=>{state.bucketReads++;return {body:new TextEncoder().encode('%PDF-test')}}}),isAdmin:async()=>state.admin,sameOrigin:()=>state.origin};
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{assert.ok(String(url).startsWith('https://api.razorpay.com/v1/'));if(String(url).endsWith('/orders')){const body=JSON.parse(options.body);assert.equal(body.amount,note.price_paise,'Price must come from the database');assert.equal(body.currency,'INR');return Response.json({id:'order_test12345',amount:body.amount,currency:'INR'})}const payment={id:'pay_test12345',order_id:state.paymentOrder,amount:state.paymentAmount,currency:state.currency,status:state.paymentStatus,amount_refunded:state.refunded};return Response.json(String(url).endsWith('/payments')?{items:[payment]}:payment)};
async function load(path,paymentModule){let source=await readFile(new URL('../'+path,import.meta.url),'utf8');source=source.replace(/^import .*?;\n/gm,line=>{if(line.includes("'cloudflare:workers'"))return 'const {env}=globalThis.__paymentTest;\n';if(line.includes("'next/headers'"))return 'const {cookies}=globalThis.__paymentTest;\n';if(line.includes("'@/lib/payments'"))return line.replace("'@/lib/payments'",JSON.stringify(paymentModule));const names=line.match(/\{(.*?)\}/)?.[1];return `const {${names}}=globalThis.__paymentTest;\n`});const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;const url='data:text/javascript;base64,'+Buffer.from(output).toString('base64');return {url,module:await import(url)}}
try{
const payment=await load('lib/payments.ts');const p=payment.module;
assert.equal(p.pricePaise('0'),0);assert.equal(p.pricePaise('25.01'),2501);
for(const value of ['0.99','-1','1e3','1.001','Infinity','100000'])assert.throws(()=>p.pricePaise(value));
const config={keyId:'rzp_live_TestKey12345',keySecret:'local-test-secret'};
state.config=await p.encryptConfig(config);assert.ok(!state.config.includes(config.keySecret));assert.deepEqual(await p.paymentConfig(),config);
const orders=(await load('app/api/payments/orders/route.ts',payment.url)).module;
const verify=(await load('app/api/payments/verify/route.ts',payment.url)).module;
const file=(await load('app/api/notes/[id]/file/route.ts',payment.url)).module;
const request=data=>new Request('https://example.test/api',{method:'POST',body:JSON.stringify(data),headers:{'Content-Type':'application/json'}});
const download=()=>file.GET(new Request('https://example.test/api/notes/note-test/file'),{params:Promise.resolve({id:note.id})});
assert.equal((await download()).status,402);assert.equal(state.bucketReads,0,'Unpaid requests must not read PDF bytes');
state.origin=false;assert.equal((await orders.POST(request({noteId:note.id}))).status,403);state.origin=true;
const result=await orders.POST(request({noteId:note.id,amount:1}));assert.equal(result.status,200);assert.equal((await result.json()).amount,2500);
assert.equal((await verify.POST(request({razorpay_order_id:state.order.id,razorpay_payment_id:'pay_test12345',razorpay_signature:'0'.repeat(64)}))).status,403);assert.equal(state.order.status,'created');
const payload={razorpay_order_id:state.order.id,razorpay_payment_id:'pay_test12345',razorpay_signature:await p.hmac(config.keySecret,state.order.id+'|pay_test12345')};
state.paymentAmount=1;assert.equal((await verify.POST(request(payload))).status,403);state.paymentAmount=2500;
state.paymentStatus='authorized';assert.equal((await verify.POST(request(payload))).status,409);state.paymentStatus='captured';
assert.equal((await verify.POST(request(payload))).status,200);assert.equal(state.order.status,'paid');
assert.equal((await verify.POST(request(payload))).status,200,'Verification is idempotent');
assert.equal((await download()).status,200);assert.equal(state.bucketReads,1);
const originalCookie=state.cookie;state.cookie='a'.repeat(64);assert.equal((await verify.POST(request(payload))).status,403);assert.equal((await download()).status,402);state.cookie=originalCookie;
state.refunded=2500;assert.equal((await download()).status,402);state.refunded=0;
state.order.status='created';assert.equal((await verify.POST(request({razorpay_order_id:state.order.id}))).status,200,'Recovery confirms captured payment on the server');
note.price_paise=0;state.cookie=undefined;assert.equal((await download()).status,200,'Free files remain downloadable');
note.price_paise=2500;state.config=await p.encryptConfig({...config,keyId:'rzp_test_TestKey12345'});assert.equal((await orders.POST(request({noteId:note.id}))).status,503,'Public visitors cannot use test payments to unlock paid files');
console.log('Payment checks passed: server pricing, encryption, origin, ownership, signature, capture, idempotency, recovery, refunds, free downloads, and test-mode protection.');
}finally{globalThis.fetch=originalFetch;delete globalThis.__paymentTest}
