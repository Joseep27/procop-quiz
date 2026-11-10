import type { Attempt, Mode, Question } from './types.ts';
import { questionKey, textoCompartido } from './text.ts';
export const diaMadrid=(fecha:string|number|Date=Date.now())=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(fecha));
const dayMs=86400000;
export const intentoCuentaPara=(attempt:Attempt,id:string)=>attempt.pregunta_id===id||attempt.preguntas_equivalentes?.includes(id)===true;
export function progreso(q:Question,attempts:Attempt[],now=Date.now()){
 const id=questionKey(q);
 const all=attempts.filter(a=>intentoCuentaPara(a,id)).sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.id.localeCompare(b.id));
 const first=new Map<string,Attempt>();for(const a of all)if(!first.has(a.dia))first.set(a.dia,a);
 let dias:string[]=[],lastDay='';
 for(const [day,a] of first){
  const success=a.primera_del_dia&&a.correccion.errores===0&&a.correccion.erratas===0&&!a.ayuda&&!a.repeticion_de&&a.numero_intento===1;
  if(!success){dias=[];lastDay='';continue;}
  const delta=lastDay?(Date.parse(day)-Date.parse(lastDay))/dayMs:Infinity;
  const required=dias.length>=2?3:1;
  if(delta>=required){dias.push(day);lastDay=day;}
 }
 const last=all.at(-1),level=Math.min(dias.length,3);
 const due=lastDay?Date.parse(lastDay)+([0,1,3,7][level])*dayMs:0;
 return {intentos:all.length,dias,consolidada:level>=3,vence:due,pendiente:now>=due,ultima:last?.fecha,exactitud:last?.correccion.exactitud??0,fallada:!!last&&last.correccion.errores>0,fallos:all.filter(a=>a.correccion.errores>0).length};
}
export function resumenBanco(questions:Question[],attempts:Attempt[],now=Date.now()){
 const frases=new Set<string>(),porConsolidar=new Set<string>(),pendientes=new Set<string>();
 for(const q of questions){
  if(!q.activo)continue;
  const texto=textoCompartido(q);
  const estado=progreso(q,attempts,now);
  frases.add(texto);
  if(!estado.consolidada)porConsolidar.add(texto);
  if(estado.pendiente)pendientes.add(texto);
 }
 return {total:frases.size,consolidadas:frases.size-porConsolidar.size,pendientes:pendientes.size};
}
export function resumenDiario(attempts:Attempt[]){
 const groups=new Map<string,Attempt[]>();for(const a of attempts){const key=`${a.dia}|${a.pregunta.procop_id}|${a.pregunta.tipo}`;groups.set(key,[...(groups.get(key)||[]),a]);}
 return [...groups.entries()].sort(([a],[b])=>b.localeCompare(a)).map(([key,rows])=>{
 const [dia,procop,tipo]=key.split('|');const first=new Map<string,Attempt>();for(const a of [...rows].sort((a,b)=>a.fecha.localeCompare(b.fecha)))if(!first.has(a.pregunta_id))first.set(a.pregunta_id,a);
 const clean=(a:Attempt)=>a.primera_sin_ayuda;
 return {key,dia,procop,tipo,intentos:rows.length,preguntas:first.size,exactitud:Math.round(rows.reduce((s,a)=>s+a.correccion.exactitud,0)/rows.length*100)/100,primera:[...first.values()].filter(clean).length,errores:rows.reduce((s,a)=>s+a.correccion.errores,0),erratas:rows.reduce((s,a)=>s+a.correccion.erratas,0),ayudas:rows.filter(a=>a.ayuda).length,repeticiones:rows.filter(a=>a.repeticion_de).length,tiempo_ms:rows.reduce((s,a)=>s+a.tiempo_ms,0)};
 });
}
export function erroresFrecuentes(attempts:Attempt[]){const counts=new Map<string,number>();for(const a of attempts)for(const d of a.correccion.diferencias)if(d.tipo!=='correcta'){const k=`${d.tipo}: ${d.esperada||'∅'} → ${d.escrita||'∅'}`;counts.set(k,(counts.get(k)||0)+1);}return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,15);}
export function crearCola(questions:Question[],attempts:Attempt[],mode:Mode,filter:{procops:string[];tipo:string;desde?:string;sesion?:string},now=Date.now(),random=Math.random){
 let result=questions.filter(q=>q.activo&&filter.procops.includes(q.procop_id)&&(filter.tipo==='ambas'||q.tipo===filter.tipo));
 if(mode==='falladas'){
  const failed=attempts.filter(a=>a.correccion.errores>0&&(!filter.desde||a.dia>=filter.desde)&&(!filter.sesion||a.sesion_id===filter.sesion));
  result=result.filter(q=>failed.some(a=>intentoCuentaPara(a,questionKey(q))));
 }
 if(mode==='rapido')result.sort((a,b)=>{const score=(q:Question)=>{const p=progreso(q,attempts,now);return (p.fallada?100:0)+(p.pendiente?30:0)+p.fallos*3+(p.ultima?Math.min(30,(now-Date.parse(p.ultima))/dayMs):30);};return score(b)-score(a);});
 else result.sort((a,b)=>a.procop_id.localeCompare(b.procop_id)||(a.tipo===b.tipo?0:a.tipo==='PT'?-1:1)||a.numero-b.numero);
 const frases=new Map<string,Question>();
 for(const q of result){
  const text=textoCompartido(q);
  if(!frases.has(text))frases.set(text,q);
 }
 result=[...frases.values()];
 if(mode==='aleatorio'){for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}}
 return result;
}
