// node --experimental-vm-modules scripts/check-reviewed-note.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
let note=null,admin=false,paid=false,bucketReads=0;
const context=vm.createContext({Response,Request,Uint8Array,atob,console,encodeURIComponent});
const mocks={
 '@/lib/storage':{database:()=>({prepare:()=>({bind:()=>({first:async()=>note})})}),bucket:()=>({get:async()=>{bucketReads++;return {body:'original PDF'}}})},
 '@/lib/admin':{isAdmin:async()=>admin},
 '@/lib/payments':{paidAccess:async()=>paid,PaymentError:class extends Error{},paymentFailure:()=>new Response(null,{status:500})}
};
const sourceFiles={'route':'app/api/notes/[id]/file/route.ts','@/lib/reviewed-note':'lib/reviewed-note.ts','@/content/reviewed-notes/concentrations':'content/reviewed-notes/concentrations.ts'};
const modules=new Map();
function moduleFor(id){
 if(modules.has(id))return modules.get(id);
 const m=mocks[id]?new vm.SyntheticModule(Object.keys(mocks[id]),function(){for(const [k,v] of Object.entries(mocks[id]))this.setExport(k,v)},{context,identifier:id}):new vm.SourceTextModule(ts.transpileModule(fs.readFileSync(sourceFiles[id],'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText,{context,identifier:id});
 modules.set(id,m);return m;
}
const route=moduleFor('route');await route.link(id=>moduleFor(id));await route.evaluate();
const id='95bb5d11-7223-444f-9d56-146190728446';
const get=async(key=id)=>route.namespace.GET(new Request('https://ezeducation.in/api/notes/'+key+'/file'),{params:Promise.resolve({id:key})});
note={file_key:'notes/'+id+'.pdf',title:'Concentrations',price_paise:0};
let r=await get();assert.equal(r.status,200);assert.equal(r.headers.get('X-Ez-Content-Revision'),'2026-10-07');assert.equal((await r.text()).slice(0,5),'%PDF-');assert.equal(bucketReads,0);
note.price_paise=1500;r=await get();assert.equal(r.status,402);assert.equal(r.headers.get('X-Ez-Content-Revision'),null);assert.match(await r.text(),/Pay for this PDF/);assert.equal(bucketReads,0);
paid=true;r=await get();assert.equal(r.status,200);assert.equal((await r.text()).slice(0,5),'%PDF-');paid=false;
admin=true;r=await get();assert.equal(r.status,200);admin=false;
note={file_key:'notes/new-upload.pdf',title:'Replacement',price_paise:0};r=await get();assert.equal(await r.text(),'original PDF');assert.equal(bucketReads,1);
note=null;r=await get();assert.equal(r.status,404);
console.log('Passed: corrected download, paid gate, purchase access, admin access, replacement fallback and missing resource.');
