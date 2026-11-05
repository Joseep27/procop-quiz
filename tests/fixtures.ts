import type { Attempt, Question } from '../src/core/types';
import content from '../src/content.json';
import { corregir, questionKey, validarContenido } from '../src/core/text';
export const bank=validarContenido(content),q=bank[0];
export function attempt(day='2026-11-01',patch:Partial<Attempt>={},question:Question=q):Attempt{return {id:crypto.randomUUID(),fecha:day+'T08:00:00.000Z',dia:day,pregunta_id:questionKey(question),pregunta:question,respuesta:question.texto_literal,correccion:corregir(question.texto_literal,question.texto_literal),ayuda:false,pistas:0,numero_intento:1,primera_del_dia:true,primera_sin_ayuda:true,tiempo_ms:10000,sesion_id:'session-1',repeticion_de:null,tolerancia:false,...patch};}
