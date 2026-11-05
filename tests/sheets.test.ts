import { describe,it,expect } from 'vitest';
import { attempt } from './fixtures';
import { planWrites,ATTEMPT_TAB,DAILY_TAB,attemptHeaders } from '../supabase/functions/sync-sheets/planner';
describe('proyección Sheets idempotente',()=>{
 it('los reintentos escriben en la misma fila sin append',()=>{const a=attempt();const rows=[{sheet_row:7,payload:a}],keys=[{id:3,day_key:`${a.dia}|1.01|PT`}];const plan=planWrites(rows,[],keys);expect(planWrites(rows,[],keys)).toEqual(plan);expect(plan[2].range).toBe("'Quiz_Intentos'!A8:Z8");expect(plan[2].values[0][0]).toBe(a.id);expect(plan[3].range).toBe("'Quiz_Resumen_Diario'!A4:M4");});
 it('solo puede apuntar a las dos pestañas del quiz',()=>{const a=attempt();const plan=planWrites([{sheet_row:1,payload:a}],[],[{id:1,day_key:`${a.dia}|1.01|PT`}]);for(const item of plan)expect([ATTEMPT_TAB,DAILY_TAB].some(tab=>item.range.startsWith(`'${tab}'!`))).toBe(true);});
 it('no depende del orden de descarga para asignar filas',()=>{const a=attempt(),b=attempt();const keys=[{id:1,day_key:`${a.dia}|1.01|PT`}];const plan=planWrites([{sheet_row:90,payload:a},{sheet_row:2,payload:b}],[],keys);expect(plan.find(p=>p.values[0][0]===a.id)?.range).toContain('A91');});
 it('conserva original y anotaciones sin reemplazar diferencias',()=>{const a=attempt();const n={id:'n',intento_id:a.id,indice:0,leve:true,fecha:a.fecha};const plan=planWrites([{sheet_row:1,payload:a}],[n],[{id:1,day_key:`${a.dia}|1.01|PT`}]);expect(plan[2].values[0]).toHaveLength(attemptHeaders.length);expect(plan[2].values[0][23]).toContain('"leve":true');expect(plan[2].values[0][8]).toBe(a.respuesta);});
 it('rechaza filas no asignadas por servidor',()=>expect(()=>planWrites([{sheet_row:0,payload:attempt()}],[],[])).toThrow());
 it('rechaza resumen sin clave de fila de servidor',()=>expect(()=>planWrites([{sheet_row:1,payload:attempt()}],[],[])).toThrow(/clave diaria/));
});
