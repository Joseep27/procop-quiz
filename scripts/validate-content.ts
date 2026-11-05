import { readFileSync } from 'node:fs';
import { validarContenido } from '../src/core/text.ts';
const questions=validarContenido(JSON.parse(readFileSync(process.argv[2]||'src/content.json','utf8')));
for(const id of [...new Set(questions.map(q=>q.procop_id))])for(const tipo of ['PT','MS'])console.log(`${id} ${tipo}: ${questions.filter(q=>q.procop_id===id&&q.tipo===tipo).length}`);
console.log(`Válidas: ${questions.length}. Iniciales generadas automáticamente.`);
