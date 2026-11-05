import { describe,it,expect } from 'vitest';
import { attempt,bank,q } from './fixtures';
import { crearCola,diaMadrid,erroresFrecuentes,progreso,resumenDiario } from '../src/core/stats';
import { corregir } from '../src/core/text';
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
