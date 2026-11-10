import { describe,it,expect } from 'vitest';
import data from '../src/content.json';
import { completarBancoLocal, corregir, esErrata, fusionarContenido, iniciales, normalizar, tokens, validarContenido } from '../src/core/text';
const bank=validarContenido(data);
describe('banco literal y versiones',()=>{
 it('102 viñetas con distribución y referencias exactas',()=>{
  const reparto={'1.01':[9,9],'1.02':[6,4],'1.03':[12,12],'1.05':[7,5],'1.06':[9,6],'1.07':[14,9]};
  expect(bank).toHaveLength(102);
  for(const [id,counts] of Object.entries(reparto)){
   expect(['PT','MS'].map(tipo=>bank.filter(q=>q.procop_id===id&&q.tipo===tipo).length)).toEqual(counts);
  }
  expect(bank.find(q=>q.procop_id==='1.02'&&q.tipo==='PT'&&q.numero===1)?.fuente.pagina).toBe(6);
 });
 it('añade las preguntas nuevas a un banco local conservando sus revisiones',()=>{
  const archived={...bank[0],activo:false};
  const custom={...bank[0],revision:'personal'};
  const local=[archived,custom,...bank.slice(1,28)];
  const updated=completarBancoLocal(local,bank);
  expect(updated).toEqual([...local,...bank.slice(28)]);
  expect(completarBancoLocal(updated,bank)).toEqual(updated);
 });
 it('conserva GLP en PT y GNL en MS del PDF',()=>{expect(bank.find(q=>q.procop_id==='1.01'&&q.tipo==='PT'&&q.numero===6)?.texto_literal).toContain('(GLP o GNC)');expect(bank.find(q=>q.procop_id==='1.01'&&q.tipo==='MS'&&q.numero===7)?.texto_literal).toContain('(GNL o GNC)');});
 it('conserva preveer y la ausencia de punto final',()=>{expect(bank.find(q=>q.procop_id==='1.02'&&q.tipo==='PT'&&q.numero===4)?.texto_literal).toContain('preveer');expect(bank.find(q=>q.procop_id==='1.02'&&q.tipo==='PT'&&q.numero===6)?.texto_literal.endsWith('etc.)')).toBe(true);});
 it('rechaza importación incompleta y duplicados',()=>{expect(()=>validarContenido([{}])).toThrow();expect(()=>validarContenido([bank[0],bank[0]])).toThrow();});
 it('impide cambiar silenciosamente una revisión',()=>{expect(()=>fusionarContenido(bank,[{...bank[0],texto_literal:'Cambiar el texto.'}])).toThrow(/Incrementa revision/);});
 it('archiva la revisión anterior y conserva ambas',()=>{const merged=fusionarContenido(bank,[{...bank[0],revision:'nueva',texto_literal:'Nuevo literal.'}]);expect(merged).toHaveLength(bank.length+1);expect(merged.find(q=>q.revision==='nueva')?.activo).toBe(true);expect(merged.find(q=>q.revision===bank[0].revision&&q.numero===1&&q.tipo==='PT')?.activo).toBe(false);});
});
describe('iniciales',()=>{
 it('incluye todas las palabras, cifras, símbolos y abreviaturas',()=>expect(iniciales('La línea de 45º y Ø 70/45 con GLP y A.T. a 250 litros/min. y 25 mm.')).toBe('L l d 45º y Ø 70/45 c GLP y A.T. a 250 litros/min y 25 mm'));
 it('no incorpora comentarios de estudio del PDF',()=>{expect(bank[0].iniciales).not.toContain('→');expect(bank[0].texto_literal).not.toContain('Identificación →');});
 it('funciona con Unicode',()=>expect(iniciales('Ésta es una protección.')).toBe('É e u p'));
});
describe('alineación',()=>{
 it('ignora mayúsculas tildes y espacios duplicados',()=>expect(corregir('Señalizar y balizar la vía.','  SENALIZAR   Y balizar la VIA!!').errores).toBe(0));
 it('ignora puntuación entre palabras y en siglas',()=>expect(corregir('activación/explosión de A.T.','activación explosión de AT').errores).toBe(0));
 it('no confunde números decimales con enteros',()=>{expect(corregir('1.5 m','15 m').errores).toBe(1);expect(corregir('1,5 m','1.5 m').errores).toBe(0);});
 it('respeta ratios, símbolos y cifras',()=>{expect(corregir('Ø 70/45 a 45º','Ø 7045 a 90º').errores).toBe(2);});
 it('localiza una omisión sin desplazar toda la frase',()=>{const c=corregir('Se deben usar los equipos de protección individual','Se deben usar equipos de protección individual');expect(c.errores).toBe(1);expect(c.diferencias.filter(d=>d.tipo==='omitida').map(d=>d.esperada)).toEqual(['los']);expect(c.diferencias.filter(d=>d.tipo==='correcta')).toHaveLength(7);});
 it('localiza palabras añadidas',()=>{const c=corregir('usar los equipos','usar siempre los equipos');expect(c.diferencias.find(d=>d.tipo==='añadida')?.escrita).toBe('siempre');});
 it('registra sustituciones y conserva ambas palabras',()=>{const c=corregir('debemos enfriar el depósito','debemos extinguir el depósito',true);expect(c.errores).toBe(1);expect(c.diferencias.find(d=>d.tipo==='sustituida')).toMatchObject({esperada:'enfriar',escrita:'extinguir'});});
 it('penaliza cambios de orden',()=>expect(corregir('primero abrir después cerrar','primero cerrar después abrir').errores).toBeGreaterThan(0));
 it('no tolera erratas por defecto',()=>expect(corregir('protección individual','protecion individual').errores).toBe(1));
 it('identifica y permite erratas mínimas solo si se configura',()=>{const c=corregir('protección individual','protecion individual',true);expect(c.errores).toBe(0);expect(c.erratas).toBe(1);expect(c.exactitud).toBe(100);expect(c.literalidad).toBe(50);});
 it('conserva negaciones, términos críticos y palabras cortas',()=>{expect(esErrata('enfriados','enfiados')).toBe(false);expect(esErrata('no','si')).toBe(false);expect(esErrata('cerrada','cerada')).toBe(false);expect(esErrata('proteccion','protexcion')).toBe(false);});
 it('permite transposición adyacente, sin equivalencia semántica',()=>expect(corregir('materiales','materilaes',true).erratas).toBe(1));
 it('vacía no es correcta y las adiciones reducen exactitud',()=>{expect(corregir('una frase','').exactitud).toBe(0);expect(corregir('una frase','una frase otra').exactitud).toBeLessThan(100);});
 it('criterios transparentes 100 / 90 / menos de 90',()=>{const ten='uno dos tres cuatro cinco seis siete ocho nueve diez';expect(corregir(ten,ten).resultado).toBe('BIEN');expect(corregir(ten,'uno dos tres cuatro cinco seis siete ocho nueve').resultado).toBe('PARCIAL');expect(corregir(ten,'uno dos tres cuatro cinco seis siete ocho').resultado).toBe('ERROR');});
 it('limita memoria para textos extremos',()=>expect(()=>corregir('a '.repeat(1601),'a')).toThrow(/1600/));
 it('cada respuesta literal del banco da 100%',()=>{for(const q of bank)expect(corregir(q.texto_literal,q.texto_literal).exactitud).toBe(100);});
});
