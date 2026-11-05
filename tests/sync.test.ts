import 'fake-indexeddb/auto';
import { beforeAll,it,expect,vi } from 'vitest';
import { all,guardarIntento,read } from '../src/core/storage';
import { attempt } from './fixtures';
import type { Attempt } from '../src/core/types';
const mock=vi.hoisted(()=>({failUpload:false,failSheets:false,calls:0,uploads:0,rows:new Map<string,unknown>(),invoke:vi.fn()}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({
 auth:{getUser:async()=>({data:{user:{id:'owner'}}})},
 from:(table:string)=>({upsert:async(rows:{id:string;payload:unknown}[])=>{mock.uploads++;if(mock.failUpload)return {error:new Error('Corte de conexión')};if(table==='quiz_attempts')rows.forEach(r=>{if(!mock.rows.has(r.id))mock.rows.set(r.id,r.payload);});return {error:null};},select:()=>({order:()=>({order:()=>({range:async()=>({data:table==='quiz_attempts'?[...mock.rows.values()].map(payload=>({payload})):[],error:null})})})})}),
 functions:{invoke:async()=>{mock.calls++;return mock.failSheets?{error:new Error('Sheets sin conexión'),data:null}:{data:{sheetsAt:'2026-11-05T08:00:00Z'},error:null};}}
})}));
let sync:typeof import('../src/core/sync');
beforeAll(async()=>{vi.stubEnv('VITE_SUPABASE_URL','https://test.supabase.co');vi.stubEnv('VITE_SUPABASE_ANON_KEY','public-test');sync=await import('../src/core/sync');});
it('mantiene la cola ante un corte y reintenta sin duplicar registros',async()=>{
 const a=attempt();await guardarIntento(a);mock.failUpload=true;const failed=await sync.synchronize();expect(failed.error).toContain('Corte');expect(failed.pending).toBe(1);expect((await all<Attempt>('attempts')).some(x=>x.id===a.id)).toBe(true);
 mock.failUpload=false;const success=await sync.synchronize();expect(success.pending).toBe(0);expect(success.sheetsAt).toBeTruthy();expect(mock.rows.size).toBe(1);await sync.synchronize();expect(mock.rows.size).toBe(1);
});
it('distingue respaldo cloud de escritura en Sheets y no borra intentos',async()=>{const a=attempt();await guardarIntento(a);mock.failSheets=true;const state=await sync.synchronize();expect(state.error).toContain('Sheets pendiente');expect(state.cloudAt).toBeTruthy();expect(state.pending).toBe(0);expect((await all<Attempt>('attempts')).some(x=>x.id===a.id)).toBe(true);const uploads=mock.uploads;mock.failSheets=false;await sync.synchronize();expect(mock.uploads).toBe(uploads);expect(mock.rows.size).toBe(2);});
it('agrupa sincronizaciones concurrentes de la misma pestaña',async()=>{const calls=mock.calls;await Promise.all([sync.synchronize(),sync.synchronize(),sync.synchronize()]);expect(mock.calls-calls).toBe(1);expect(await read('owner',null)).toBe('owner');});
