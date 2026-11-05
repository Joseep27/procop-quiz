import type { Annotation, Attempt } from './types.ts';
let opened:Promise<IDBDatabase>|undefined;
function db(){return opened??=new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('procop-quiz',1);req.onupgradeneeded=()=>{for(const name of ['attempts','annotations','kv'])req.result.createObjectStore(name,{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
export async function all<T>(store:string):Promise<T[]>{const database=await db();return new Promise((resolve,reject)=>{const req=database.transaction(store).objectStore(store).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
export async function put(store:string,value:unknown){const database=await db();return new Promise<void>((resolve,reject)=>{const tx=database.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('No se pudo guardar.'));});}
export async function read<T>(id:string,fallback:T):Promise<T>{const rows=await all<{id:string;value:T}>('kv');return rows.find(r=>r.id===id)?.value??fallback;}
export const write=(id:string,value:unknown)=>put('kv',{id,value});
export async function mergeImmutable<T extends {id:string}>(store:string,rows:T[]){
 const database=await db();await new Promise<void>((resolve,reject)=>{const tx=database.transaction(store,'readwrite');
  for(const row of rows){const req=tx.objectStore(store).add(row);req.onerror=e=>{if(req.error?.name==='ConstraintError'){e.preventDefault();e.stopPropagation();}};}
  tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('No se pudo guardar el historial.'));
 });
}
export async function guardarIntento(attempt:Attempt){await mergeImmutable('attempts',[attempt]);}
export async function guardarAnotacion(a:Annotation){await mergeImmutable('annotations',[a]);}
export async function requestDurability(){try{return await navigator.storage?.persist();}catch{return false;}}
