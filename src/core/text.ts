import type { Correction, Difference, Question } from './types.ts';
// Numbers, Ø and acronyms are semantic tokens; punctuation itself is ignored.
export const tokens=(s:string):string[] => s.match(/(?:\p{L}\.){2,}|(?:litros|l)\/(?:min|s|h)|[Øø]|[+-]?\d+(?:[.,/]\d+)*(?:[º°%]|\p{L}+)?|[\p{L}\p{M}]+/gu)||[];
export const normalizar=(s:string)=>{const n=s.toLocaleLowerCase('es').normalize('NFD').replace(/\p{M}/gu,'');return /\d/.test(n)?n.replace(/(\d),(\d)/g,'$1.$2'):n.replace(/\./g,'');};
const units=new Set(['mm','cm','m','mts','v','min','litros','kg','km','l','litros/min','l/min','l/s','l/h']);
export function iniciales(texto:string) {return tokens(texto).map(t=>/\d|[Øø]/u.test(t)||units.has(t.toLowerCase())||/^[A-ZÁÉÍÓÚÑ.]{2,}$/.test(t)?t:t[0]).join(' ');}
const critical=new Set('no si sin solo siempre nunca mayor menor antes despues agua espuma enfriar enfriados enfriamiento extinguir extincion inflamarse combustible glp gnc gnl tension cerrado cerrada abierta abiertas izquierda derecha delantera trasera norte sur este oeste'.split(' '));
export function esErrata(a:string,b:string) {
 if(a===b||a.length<6||b.length<6||critical.has(a)||critical.has(b)||/[\dØøº°%/]/.test(a+b)||units.has(a)||units.has(b))return false;
 if(a.length===b.length){const dif=[...a].map((c,i)=>c!==b[i]?i:-1).filter(i=>i>=0);return dif.length===2&&dif[1]===dif[0]+1&&a[dif[0]]===b[dif[1]]&&a[dif[1]]===b[dif[0]];}
 if(Math.abs(a.length-b.length)!==1)return false;
 const [long,short]=a.length>b.length?[a,b]:[b,a];
 return [...long].some((_,i)=>long.slice(0,i)+long.slice(i+1)===short);
}
export function corregir(referencia:string,respuesta:string,tolerancia=false):Correction {
 const a=tokens(referencia),b=tokens(respuesta),an=a.map(normalizar),bn=b.map(normalizar);
 if(a.length>1600||b.length>1600)throw new Error('Máximo 1600 palabras por respuesta.');
 const cols=b.length+1,dp=new Float64Array((a.length+1)*cols);
 for(let i=0;i<=a.length;i++)dp[i*cols]=i;
 for(let j=0;j<=b.length;j++)dp[j]=j;
 const cost=(i:number,j:number)=>an[i]===bn[j]?0:tolerancia&&esErrata(an[i],bn[j])?0.25:1;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)dp[i*cols+j]=Math.min(dp[(i-1)*cols+j]+1,dp[i*cols+j-1]+1,dp[(i-1)*cols+j-1]+cost(i-1,j-1));
 let i=a.length,j=b.length;const reverse:Omit<Difference,'indice'>[]=[];
 while(i||j){if(i&&j&&dp[i*cols+j]===dp[(i-1)*cols+j-1]+cost(i-1,j-1)){reverse.push({tipo:an[i-1]===bn[j-1]?'correcta':tolerancia&&esErrata(an[i-1],bn[j-1])?'errata':'sustituida',esperada:a[--i],escrita:b[--j]});}else if(i&&dp[i*cols+j]===dp[(i-1)*cols+j]+1){reverse.push({tipo:'omitida',esperada:a[--i]});}else{reverse.push({tipo:'añadida',escrita:b[--j]});}}
 const diferencias=reverse.reverse().map((d,indice)=>({...d,indice}));
 const errores=diferencias.filter(d=>!['correcta','errata'].includes(d.tipo)).length;
 const erratas=diferencias.filter(d=>d.tipo==='errata').length;
 const score=(n:number)=>Math.max(0,Math.round((1-n/Math.max(a.length,b.length,1))*10000)/100);
 const exactitud=score(errores),literalidad=score(errores+erratas);
 return {diferencias,errores,erratas,exactitud,literalidad,resultado:errores===0?'BIEN':exactitud>=90?'PARCIAL':'ERROR',algoritmo:'tokens-v1'};
}
export const questionKey=(q:Question)=>`${q.procop_id}:${q.tipo}:${q.numero}@${q.version_documento}#${q.revision}`;
export const logicalKey=(q:Question)=>`${q.procop_id}:${q.tipo}:${q.numero}`;
export function validarContenido(value:unknown):Question[]{
 if(!Array.isArray(value)||!value.length||value.length>2000)throw new Error('Se requiere un array JSON con 1–2000 preguntas.');
 const seen=new Set<string>(),activeLogical=new Set<string>();return value.map((v:unknown)=>{
  if(!v||typeof v!=='object')throw new Error('Pregunta no válida.');
  const q=v as Question;
  for(const k of ['procop_id','procop_nombre','apartado','texto_literal','version_documento','revision'] as const)if(typeof q[k]!=='string'||!q[k].trim())throw new Error(`Falta ${k}.`);
  if(!['PT','MS'].includes(q.tipo)||!Number.isInteger(q.numero)||q.numero<1||typeof q.activo!=='boolean'||!q.fuente||!Number.isInteger(q.fuente.pagina)||q.fuente.pagina<1||typeof q.fuente.archivo!=='string'||!q.fuente.archivo||!/^[a-f0-9]{64}$/i.test(q.fuente.sha256)||q.texto_literal.length>15000||tokens(q.texto_literal).length>1600)throw new Error('Tipo, número, fuente, hash SHA256 o longitud inválidos.');
  if(q.activo){if(activeLogical.has(logicalKey(q)))throw new Error('Solo puede haber una revisión activa por pregunta.');activeLogical.add(logicalKey(q));}
  if(seen.has(questionKey(q)))throw new Error('Versión de pregunta duplicada.');seen.add(questionKey(q));
  return {...q,iniciales:iniciales(q.texto_literal)};
 });
}
export function completarBancoLocal(local:Question[],base:Question[]):Question[]{
 const clavesLocales=new Set(local.map(logicalKey));
 return [...local,...base.filter(q=>!clavesLocales.has(logicalKey(q)))];
}
export function fusionarContenido(base:Question[],incoming:Question[]):Question[]{
 const map=new Map(base.map(q=>[questionKey(q),q]));
 for(const q of incoming){const old=map.get(questionKey(q));if(old&&JSON.stringify([old.procop_id,old.procop_nombre,old.tipo,old.numero,old.apartado,old.texto_literal,old.version_documento,old.revision,old.fuente.archivo,old.fuente.pagina,old.fuente.sha256])!==JSON.stringify([q.procop_id,q.procop_nombre,q.tipo,q.numero,q.apartado,q.texto_literal,q.version_documento,q.revision,q.fuente.archivo,q.fuente.pagina,q.fuente.sha256]))throw new Error(`La versión ${questionKey(q)} ya existe con otro contenido. Incrementa revision.`);map.set(questionKey(q),q);}
 // Each incoming version replaces the active selection for its logical question. Old versions survive.
 const incomingKeys=new Map(incoming.filter(q=>q.activo).map(q=>[logicalKey(q),questionKey(q)]));
 return [...map.values()].map(q=>({...q,activo:incomingKeys.has(logicalKey(q))?incomingKeys.get(logicalKey(q))===questionKey(q)&&q.activo:q.activo}));
}
