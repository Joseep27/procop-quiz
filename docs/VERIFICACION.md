# Verificación de entrega — 05/11/2026

- 52 tests automatizados aprobados: contenido y alineación (25), estadísticas (12), IndexedDB/CSV (6), sincronización con servicios simulados (3), proyección determinista Sheets (6).
- `npm run build`: TypeScript y build Vite correctos.
- `npm run content:validate`: 1.01 PT=9/MS=9, 1.02 PT=6/MS=4, total 28.
- `npx deno check --node-modules-dir=manual --no-remote --no-lock supabase/functions/sync-sheets/index.ts`: correcto, con `jose` instalado como dependencia de desarrollo para verificar los imports npm.
- Cotejo visual de páginas 11 y 13 del PDF 1.01, y 6, 7 y 8 del PDF 1.02. Excluidas anotaciones editoriales.
- Navegador: selección de sesión, omisión de «correcta» detectada con exactitud 95,24 %, repetición literal con 100 % registrada como repetición inmediata, historial de los dos intentos y cero frases consolidadas.
- Borrador: escribir en PT2, salir al inicio y continuar recupera el texto.
- Ancho reducido mediante zoom de navegador: viewport CSS 454px, ancho del documento 449px, textarea 375,33px, navegación inferior visible y sin desbordamiento horizontal. No equivale a una prueba en un dispositivo físico.

Los tests de sincronización usan dobles controlados para simular cortes y fallos Google. No se han probado escrituras reales en Supabase o Google Sheets: faltan proyecto independiente y credenciales. Tampoco se han ejecutado políticas RLS contra una instancia PostgreSQL real. El README incluye la prueba de aceptación que debe hacerse después de conectar el backend.
