import { createClient } from '@supabase/supabase-js';
import type { Annotation, Attempt } from './types.ts';
import { all, mergeImmutable, read, write } from './storage.ts';
const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_ANON_KEY;
export const cloud=url&&key?createClient(url,key):null;
export interface SyncState {cloudAt?:string;sheetsAt?:string;error?:string;pending:number;configured:boolean}
let running:Promise<SyncState>|null=null;
export async function pendingCount(){const done=await read<string[]>('cloud-ack',[]);return (await all<Attempt>('attempts')).filter(a=>!done.includes(a.id)).length;}
export function synchronize():Promise<SyncState>{if(running)return running;running=run().finally(()=>{running=null;});return running;}
async function run():Promise<SyncState>{
 const old=await read<SyncState>('sync',{pending:0,configured:!!cloud});
 try{
  if(!cloud)throw new Error('Conexión no configurada. Tus intentos están guardados en este dispositivo.');
  const {data:{user},error}=await cloud.auth.getUser();if(error||!user)throw new Error('Inicia sesión para sincronizar.');
  const owner=await read<string|null>('owner',null);if(owner&&owner!==user.id)throw new Error('Este dispositivo está vinculado a otra cuenta. Exporta tus datos antes de cambiar de usuario.');
  await write('owner',user.id);
  const ack=new Set(await read<string[]>('cloud-ack',[])),annAck=new Set(await read<string[]>('annotation-ack',[]));
  const attempts=(await all<Attempt>('attempts')).filter(a=>!ack.has(a.id));
  const anns=(await all<Annotation>('annotations')).filter(a=>!annAck.has(a.id));
  // Upload first; server sync and acknowledgement are separate so Sheets failure never loses data.
  for(let i=0;i<attempts.length;i+=100){const batch=attempts.slice(i,i+100);const {error}=await cloud.from('quiz_attempts').upsert(batch.map(a=>({id:a.id,user_id:user.id,payload:a})),{onConflict:'id',ignoreDuplicates:true});if(error)throw error;batch.forEach(a=>ack.add(a.id));await write('cloud-ack',[...ack]);}
  for(let i=0;i<anns.length;i+=100){const batch=anns.slice(i,i+100);const {error}=await cloud.from('quiz_annotations').upsert(batch.map(a=>({id:a.id,user_id:user.id,attempt_id:a.intento_id,payload:a})),{onConflict:'id',ignoreDuplicates:true});if(error)throw error;batch.forEach(a=>annAck.add(a.id));await write('annotation-ack',[...annAck]);}
  for(const [table,store] of [['quiz_attempts','attempts'],['quiz_annotations','annotations']]){
   for(let offset=0;;offset+=500){const {data,error}=await cloud.from(table).select('payload').order('created_at').order('id').range(offset,offset+499);if(error)throw error;await mergeImmutable(store,data.map(r=>r.payload));for(const row of data)(store==='attempts'?ack:annAck).add(row.payload.id);if(data.length<500)break;}
  }
  await write('cloud-ack',[...ack]);await write('annotation-ack',[...annAck]);
  const cloudAt=new Date().toISOString();await write('sync',{...old,cloudAt,error:undefined,pending:0,configured:true});
  const {data,error:edgeError}=await cloud.functions.invoke('sync-sheets',{body:{}});
  if(edgeError){let message=edgeError.message;try{const context=(edgeError as {context?:Response}).context;const body=await context?.json();if(body?.error)message=body.error;}catch{/* Keep the SDK error if there is no JSON response. */}throw new Error(`Historial guardado en Supabase; Sheets pendiente: ${message}`);}
  if(!data?.sheetsAt)throw new Error(data?.error||'El servidor no confirmó la escritura en Sheets.');
  const state={cloudAt,sheetsAt:data.sheetsAt,pending:0,configured:true};await write('sync',state);return state;
 }catch(e){const current=await read<SyncState>('sync',old);const state={...current,pending:await pendingCount(),configured:!!cloud,error:e instanceof Error?e.message:String(e)};await write('sync',state);return state;}
}
