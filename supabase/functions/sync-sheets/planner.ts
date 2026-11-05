import type { Annotation, Attempt } from '../../../src/core/types.ts';
import { resumenDiario } from '../../../src/core/stats.ts';
export const ATTEMPT_TAB='Quiz_Intentos';
export const DAILY_TAB='Quiz_Resumen_Diario';
export const attemptHeaders=['id','fecha_hora','dia_madrid','procop','tipo','numero','version_documento','revision','respuesta_original','referencia_literal','errores','erratas','exactitud','literalidad','resultado','ayuda','pistas','numero_intento','primera_sin_ayuda','tiempo_ms','sesion_id','repeticion_de','diferencias_json','anotaciones_json','fuente_json','algoritmo'];
export const dailyHeaders=['clave','dia','procop','tipo','intentos','preguntas','exactitud_media','primera_sin_ayuda','errores','erratas','ayudas','repeticiones','tiempo_ms'];
export function attemptValues(a:Attempt,annotations:Annotation[]){return [a.id,a.fecha,a.dia,a.pregunta.procop_id,a.pregunta.tipo,a.pregunta.numero,a.pregunta.version_documento,a.pregunta.revision,a.respuesta,a.pregunta.texto_literal,a.correccion.errores,a.correccion.erratas,a.correccion.exactitud,a.correccion.literalidad,a.correccion.resultado,a.ayuda,a.pistas,a.numero_intento,a.primera_sin_ayuda,a.tiempo_ms,a.sesion_id,a.repeticion_de||'',JSON.stringify(a.correccion.diferencias),JSON.stringify(annotations.filter(n=>n.intento_id===a.id)),JSON.stringify(a.pregunta.fuente),a.correccion.algoritmo];}
export function planWrites(rows:{sheet_row:number;payload:Attempt}[],annotations:Annotation[],keys:{id:number;day_key:string}[]){
 const data:{range:string;values:unknown[][]}[]=[{range:`'${ATTEMPT_TAB}'!A1:Z1`,values:[attemptHeaders]},{range:`'${DAILY_TAB}'!A1:M1`,values:[dailyHeaders]}];
 for(const row of rows){if(!Number.isSafeInteger(row.sheet_row)||row.sheet_row<1)throw new Error('Fila de servidor no válida.');data.push({range:`'${ATTEMPT_TAB}'!A${row.sheet_row+1}:Z${row.sheet_row+1}`,values:[attemptValues(row.payload,annotations)]});}
 const index=new Map(keys.map(k=>[k.day_key,k.id]));
 for(const d of resumenDiario(rows.map(r=>r.payload))){const row=index.get(d.key);if(!row)throw new Error('Falta una clave diaria de servidor.');data.push({range:`'${DAILY_TAB}'!A${row+1}:M${row+1}`,values:[[d.key,d.dia,d.procop,d.tipo,d.intentos,d.preguntas,d.exactitud,d.primera,d.errores,d.erratas,d.ayudas,d.repeticiones,d.tiempo_ms]]});}
 return data;
}
