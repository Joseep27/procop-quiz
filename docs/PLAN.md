# Plan técnico y estado de partida

05/11/2026. Directorio inicial sin repositorio ni código. Dos PDF aportados, con anotaciones editoriales. Extraídos y cotejados visualmente: 1.01 §5.5 p11 (9), §6.2 p13 (9); 1.02 §5.5 pp6–7 (6), §6.2 p8 (4). Las viñetas originales no tienen números; `numero` es su ordinal, sin atribuir al PDF una numeración impresa inexistente.

1. React + TypeScript + Vite; módulos independientes de contenido, alineación, estadísticas, IndexedDB y sincronización.
2. Banco versionado JSON, referencias de página y hash SHA256 de PDF. Importación aditiva, revisión y confirmación explícita, versiones antiguas retenidas.
3. Corrección por distancia de edición de tokens con traceback; coincidencias normalizadas, diferencias literales y erratas conservadas. Sin sinónimos automáticos.
4. Intentos inmutables y anotaciones de levedad separadas. Sesión, borrador y tiempo guardados en IndexedDB; caché offline versionada por build.
5. Consolidación conservadora: tres primeros intentos del día sin ayuda, en días diferentes, separados al menos 1 y 3 días. Repeticiones y ayudas nunca consolidan.
6. Proyecto Supabase nuevo, usuario único permitido, RLS, función autenticada y secretos de servicio solo en servidor. Subida idempotente por UUID, filas deterministas en Sheets y bloqueo para sincronizaciones concurrentes. Ninguna escritura en pestañas existentes.
7. Tests unitarios, persistencia y sincronización; build y comprobación de interfaz. GitHub Actions para Pages, guía de despliegue y conexión.

El conector GitHub disponible carece de crear repositorios/configurar Pages. CLI sin sesión; navegador en pantalla de login. No hay credenciales ni proyecto Supabase nuevo provisionado. No se toca otro repositorio, proyecto Supabase ni registro maestro. La publicación y sincronización solo se describirán como realizadas tras obtener confirmación real de los servicios.
