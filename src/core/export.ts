import type { Annotation, Attempt } from './types.ts';
export function csv(attempts:Attempt[],annotations:Annotation[]=[]){
 const headers=['id','fecha','dia','procop','tipo','numero','version','revision','respuesta','referencia','errores','erratas','exactitud','literalidad','resultado','ayuda','pistas','numero_intento','primera_sin_ayuda','tiempo_ms','repeticion_de','diferencias_json','anotaciones_json'];
 const cell=(v:unknown)=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 return '\ufeff'+[headers,...attempts.map(a=>[a.id,a.fecha,a.dia,a.pregunta.procop_id,a.pregunta.tipo,a.pregunta.numero,a.pregunta.version_documento,a.pregunta.revision,a.respuesta,a.pregunta.texto_literal,a.correccion.errores,a.correccion.erratas,a.correccion.exactitud,a.correccion.literalidad,a.correccion.resultado,a.ayuda,a.pistas,a.numero_intento,a.primera_sin_ayuda,a.tiempo_ms,a.repeticion_de,JSON.stringify(a.correccion.diferencias),JSON.stringify(annotations.filter(n=>n.intento_id===a.id))])].map(row=>row.map(cell).join(',')).join('\r\n');
}
export function download(name:string,content:string,type='application/json'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
