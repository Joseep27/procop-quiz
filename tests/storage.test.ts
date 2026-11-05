import 'fake-indexeddb/auto';
import { describe,it,expect } from 'vitest';
import { all,guardarIntento,guardarAnotacion,read,write,mergeImmutable } from '../src/core/storage';
import { attempt } from './fixtures';
import type { Attempt,Annotation } from '../src/core/types';
import { csv } from '../src/core/export';
describe('persistencia real',()=>{
 it('recupera texto exacto de un intento',async()=>{const a=attempt('2026-11-01',{respuesta:'Mi RESPUESTA\ncon  dos espacios.'});await guardarIntento(a);expect((await all<Attempt>('attempts')).find(r=>r.id===a.id)).toEqual(a);});
 it('no duplica ni reescribe un UUID existente',async()=>{const a=attempt();await guardarIntento(a);await guardarIntento({...a,respuesta:'cambiada'});expect((await all<Attempt>('attempts')).filter(r=>r.id===a.id)).toEqual([a]);});
 it('conserva borrador sesión resultado y tiempo de inicio',async()=>{const draft={borrador:'respuesta sin acabar',inicio:12,resultado:null};await write('test-session',draft);expect(await read('test-session',null)).toEqual(draft);});
 it('anotación separada mantiene intento original',async()=>{const a=attempt();await guardarIntento(a);const n={id:crypto.randomUUID(),intento_id:a.id,indice:0,leve:true,fecha:new Date().toISOString()};await guardarAnotacion(n);expect((await all<Annotation>('annotations')).find(r=>r.id===n.id)).toEqual(n);expect((await all<Attempt>('attempts')).find(r=>r.id===a.id)).toEqual(a);});
 it('fusiona respaldos sin perder intentos',async()=>{const a=attempt(),b=attempt();await mergeImmutable('attempts',[a,b,a]);expect((await all<Attempt>('attempts')).filter(x=>x.id===a.id||x.id===b.id)).toHaveLength(2);});
 it('CSV escapa comillas saltos y fórmulas de hoja de cálculo',()=>{const output=csv([attempt('2026-11-01',{respuesta:'=IMPORTXML("mal")\nsegunda línea'})]);expect(output).toContain('"\'=IMPORTXML(""mal"")\nsegunda línea"');});
});
