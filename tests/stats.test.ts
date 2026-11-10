import { describe,it,expect } from 'vitest';
import { attempt,bank,q } from './fixtures';
import { crearCola,diaMadrid,erroresFrecuentes,intentoCuentaPara,progreso,resumenDiario } from '../src/core/stats';
import { corregir, otrasCoincidencias, questionKey, textoCompartido } from '../src/core/text';
describe('estadísticas y espaciado',()=>{
 it('usa día de Madrid incluso cruzando medianoche UTC',()=>expect(diaMadrid('2026-11-01T23:30:00Z')).toBe('2026-11-02'));
 it('no consolida cinco repeticiones inmediatas',()=>{const rows=Array.from({length:5},(_,i)=>attempt('2026-11-01',{numero_intento:i+1,repeticion_de:i?'first':null,fecha:`2026-11-01T08:0${i}:00Z`}));expect(progreso(q,rows).dias).toHaveLength(1);expect(progreso(q,rows).consolidada).toBe(false);});
 it('consolida solo tras 1 y 3 días de separación',()=>{expect(progreso(q,[attempt('2026-11-01'),attempt('2026-11-02'),attempt('2026-11-05')]).consolidada).toBe(true);expect(progreso(q,[attempt('2026-11-01'),attempt('2026-11-02'),attempt('2026-11-03')]).consolidada).toBe(false);});
 it('un fallo al primer intento reinicia y el éxito posterior no lo borra',()=>{const fail=attempt('2026-11-05',{correccion:corregir(q.texto_literal,'mal')});const retry=attempt('2026-11-05',{numero_intento:2,repeticion_de:fail.id,fecha:'2026-11-05T09:00:00Z'});expect(progreso(q,[attempt('2026-11-01'),attempt('2026-11-02'),fail,retry]).dias).toHaveLength(0);});
 it('ni pistas ni erratas toleradas acreditan un día',()=>{expect(progreso(q,[attempt('2026-11-01',{ayuda:true})]).dias).toHaveLength(0);expect(progreso(q,[attempt('2026-11-01',{correccion:{...corregir('protección','protecion',true)}})]).dias).toHaveLength(0);});
 it('una revisión nueva no hereda consolidación',()=>expect(progreso({...q,revision:'otra'},[attempt('2026-11-01'),attempt('2026-11-02'),attempt('2026-11-05')]).intentos).toBe(0));
 it('diferencia primer éxito de cinco intentos y ayuda',()=>{const failed=attempt('2026-11-01',{correccion:corregir(q.texto_literal,'mal'),primera_sin_ayuda:false});const rows=[failed,attempt('2026-11-01',{numero_intento:5,repeticion_de:failed.id,primera_sin_ayuda:false,fecha:'2026-11-01T09:00:00Z'})];const summary=resumenDiario(rows)[0];expect(summary.primera).toBe(0);expect(summary.intentos).toBe(2);expect(summary.repeticiones).toBe(1);});
 it('agrupa por día PROCOP y apartado',()=>{const rows=[attempt(),attempt('2026-11-01',{},bank[9]),attempt('2026-11-02')];expect(resumenDiario(rows)).toHaveLength(3);});
 it('ordena normal, filtra y mezcla sin perder preguntas',()=>{expect(crearCola(bank,[],'normal',{procops:['1.02'],tipo:'PT'})).toHaveLength(6);expect(crearCola(bank,[],'aleatorio',{procops:['1.01'],tipo:'ambas'},Date.now(),()=>.1)).toHaveLength(18);});
 it('falladas por periodo o sesión',()=>{const a=attempt('2026-11-01',{correccion:corregir(q.texto_literal,'mal')});expect(crearCola(bank,[a],'falladas',{procops:['1.01'],tipo:'ambas'})).toHaveLength(1);expect(crearCola(bank,[a],'falladas',{procops:['1.01'],tipo:'ambas',desde:'2026-11-02'})).toHaveLength(0);expect(crearCola(bank,[a],'falladas',{procops:['1.01'],tipo:'ambas',sesion:'otro'})).toHaveLength(0);});
 it('prioriza fallos en repaso rápido',()=>{const failed=attempt('2026-11-01',{correccion:corregir(bank[3].texto_literal,'mal')},bank[3]);expect(crearCola(bank,[failed],'rapido',{procops:['1.01'],tipo:'PT'})[0].numero).toBe(4);});
 it('cuenta errores frecuentes por diferencia y conserva la original',()=>{const a=attempt('2026-11-01',{correccion:corregir('usar agua','usar espuma')});expect(erroresFrecuentes([a,a])[0]).toEqual(['sustituida: agua → espuma',2]);});
});

describe('frases compartidas',()=>{
 const [pt,ms]=bank.filter(q=>q.procop_id==='1.03'&&((q.tipo==='PT'&&q.numero===2)||(q.tipo==='MS'&&q.numero===1)));
 const filter={procops:['1.03'],tipo:'ambas'};

 it('agrupa solo textos idénticos después de aplicar los filtros y conserva el orden',()=>{
  const ids=[...new Set(bank.map(q=>q.procop_id))];
  for(const mode of ['normal','aleatorio','rapido'] as const){
   const queue=crearCola(bank,[],mode,{procops:ids,tipo:'ambas'});
   expect(queue).toHaveLength(75);
   expect(new Set(queue.map(textoCompartido)).size).toBe(75);
  }
  const queue=crearCola(bank,[],'normal',filter);
  expect(queue.filter(q=>textoCompartido(q)===textoCompartido(pt))).toEqual([pt]);
  expect(crearCola(bank,[],'normal',{...filter,tipo:'MS'})[0]).toBe(ms);
  const variante={...ms,texto_literal:ms.texto_literal.replace('2','3')};
  expect(crearCola([pt,variante],[],'normal',filter)).toEqual([pt,variante]);
 });

 it('asocia las revisiones activas y conserva un solo registro por intento',()=>{
  const archived={...ms,revision:'anterior',activo:false};
  expect(otrasCoincidencias(pt,bank)).toEqual([ms]);
  expect(otrasCoincidencias(archived,bank)).toEqual([]);
  const records=[
   attempt('2026-11-01',{preguntas_equivalentes:[questionKey(ms)]},pt),
   attempt('2026-11-02',{preguntas_equivalentes:[questionKey(pt)]},ms),
   attempt('2026-11-05',{preguntas_equivalentes:[questionKey(ms)]},pt),
  ];
  expect(records.every(a=>intentoCuentaPara(a,questionKey(ms)))).toBe(true);
  expect(progreso(pt,records).consolidada).toBe(true);
  expect(progreso(ms,records).consolidada).toBe(true);
  expect(progreso(archived,records).intentos).toBe(0);
  expect(resumenDiario(records).reduce((n,row)=>n+row.intentos,0)).toBe(3);
 });

 it('permite repasar un fallo compartido desde cualquiera de sus apartados',()=>{
  const patch={correccion:corregir(pt.texto_literal,'mal')};
  const historical=attempt('2026-11-01',patch,pt);
  const shared=attempt('2026-11-02',{...patch,preguntas_equivalentes:[questionKey(ms)]},pt);
  const msFilter={...filter,tipo:'MS'};
  expect(crearCola(bank,[historical],'falladas',msFilter)).toEqual([]);
  expect(crearCola(bank,[historical,shared],'falladas',msFilter)).toEqual([ms]);
  expect(crearCola(bank,[historical,shared],'falladas',filter)).toEqual([pt]);
 });
});
