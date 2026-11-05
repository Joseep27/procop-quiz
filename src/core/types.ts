export interface Question {
 procop_id:string; procop_nombre:string; tipo:'PT'|'MS'; numero:number; apartado:string;
 texto_literal:string; iniciales?:string; version_documento:string; revision:string;
 fuente:{archivo:string;pagina:number;sha256:string}; activo:boolean;
}
export type DiffKind='correcta'|'omitida'|'añadida'|'sustituida'|'errata';
export interface Difference { tipo:DiffKind; esperada?:string; escrita?:string; indice:number }
export interface Correction { diferencias:Difference[]; errores:number; erratas:number; exactitud:number; literalidad:number; resultado:'BIEN'|'PARCIAL'|'ERROR'; algoritmo:'tokens-v1' }
export interface Attempt {
 id:string; fecha:string; dia:string; pregunta_id:string; pregunta:Question; respuesta:string;
 correccion:Correction; ayuda:boolean; pistas:number; numero_intento:number; primera_del_dia:boolean;
 primera_sin_ayuda:boolean; tiempo_ms:number; sesion_id:string; repeticion_de:string|null; tolerancia:boolean;
}
export interface Annotation { id:string; intento_id:string; indice:number; leve:boolean; fecha:string }
export type Mode='normal'|'rapido'|'falladas'|'aleatorio';
export interface StudySession { id:string; cola:Question[]; posicion:number; modo:Mode; borrador:string; inicio:number; ayuda:boolean; pistas:number; resultado:Attempt|null; repeticion_de:string|null; intentos_pregunta:number }
