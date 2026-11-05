# PROCOP · Cuaderno de práctica

Aplicación React + TypeScript + Vite para recordar literalmente las Pautas de Trabajo y las Medidas de Seguridad de Bomberos València.

## Estado de entrega

- Banco real de **28 preguntas**, transcrito y cotejado con los dos PDF aportados: 1.01 (9 PT + 9 MS), 1.02 (6 PT + 4 MS).
- Guardado real en IndexedDB; no necesita backend para estudiar. Sin datos de ejemplo ni resultados ficticios.
- Modos normal, rápido, falladas por periodo/sesión y aleatorio. Filtros por varios PROCOP y PT/MS.
- Historial inmutable, comparación por palabras, versiones de referencia, anotaciones de levedad, borradores, estadísticas y exportación/restauración JSON/CSV.
- Backend Supabase y función Sheets implementados, **pendientes de crear y conectar un proyecto nuevo y las credenciales de servidor**. El registro maestro no se ha modificado.
- Tests de corrección, contenido, estadísticas, IndexedDB, reconexión y proyección idempotente. Las pruebas con servicios reales requieren la configuración descrita abajo; los tests locales no demuestran conexión real a Google.

## Arrancar en local

Node 24 LTS y npm.

```bash
npm ci
npm test
npm run content:validate
npm run dev
```

Abre la dirección que indique Vite. Para producción:

```bash
npm run build
npm run preview
```

Sin variables de entorno, la aplicación usa exclusivamente el navegador y muestra «Solo local». Un fallo de IndexedDB se presenta como error; no se confirma un intento hasta terminar la transacción.

## Uso diario

1. Selecciona procedimientos, apartado y modo.
2. Escribe la frase completa guiándote por sus iniciales. Ctrl/⌘ + Enter comprueba la respuesta.
3. Examina cada palabra omitida, añadida, sustituida o escrita con errata.
4. Repite la frase o continúa. «Guardar y salir» conserva la sesión y el borrador.
5. Consulta Estadísticas e Historial. Las ayudas y las repeticiones inmediatas se registran por separado.

El borrador se guarda al escribir. Navegar dentro de la aplicación lo conserva. Sustituir una sesión pide confirmación. No se permite comprobar dos veces el mismo resultado. El tiempo mide tiempo de reloj desde que se abrió la frase, incluyendo pausas y reaperturas; no es tiempo activo de teclado.

## Criterios de corrección

La corrección usa programación dinámica con alineación de tokens y reconstrucción del recorrido. No compara la frase como una única cadena.

- Ignora mayúsculas, tildes, puntuación y espacios repetidos. Las siglas A.T./AT coinciden.
- Conserva cifras, unidades, grados, diámetro y razones como 70/45. Los decimales 1,5 y 1.5 coinciden; 1.5 y 15 no.
- No utiliza sinónimos ni equivalencias conceptuales. Enfriar/extinguir y GLP/GNL son distintos.
- Tolerancia desactivada inicialmente. Al activarla permite una letra omitida/añadida o transposición adyacente en palabras de al menos seis letras, excepto cifras, unidades, negaciones y un conjunto conservador de términos críticos. No acepta sustituciones de letras automáticamente. No es un diccionario semántico: cualquier otra discrepancia puede revisarse y anotarse manualmente.
- Las erratas toleradas se muestran siempre; la respuesta original permanece intacta.

`exactitud = max(0, 1 - errores / max(palabras_referencia, palabras_respuesta, 1)) × 100`, redondeada a dos decimales. `literalidad` aplica la misma fórmula incluyendo también las erratas toleradas.

| Indicador | Regla |
|---|---|
| 🟢 BIEN | Cero errores no tolerados; puede contener erratas señaladas si se activó la tolerancia |
| 🟡 PARCIAL | Uno o más errores y exactitud ≥ 90 % |
| 🔴 ERROR | Exactitud < 90 % |

Una anotación «leve» añade un evento independiente: no modifica la diferencia detectada, el texto, la exactitud ni el resultado originales.

## Repetición espaciada y estadísticas

Cada versión de frase tiene su progreso. Se acredita únicamente el primer intento cronológico de cada día de Madrid, si es literal, sin erratas, sin ayuda, sin repetición y con número de intento 1. Se requieren tres días acreditados: al menos 1 día entre el primero y segundo, y 3 entre el segundo y tercero. Después queda consolidada y vence un nuevo repaso a los 7 días. Un primer intento fallido en otro día reinicia la secuencia. Repetir inmediatamente no añade días acreditados.

«A la primera» cuenta éxitos sin ayuda en el primer intento del día; puede incluir erratas si se configuró esa tolerancia. Consolidar exige además cero erratas. El resumen diario incluye todos los intentos y desglosa ayudas/repeticiones; la media no debe interpretarse como una tasa de primeros aciertos.

Repaso rápido prioriza último resultado fallado, repaso vencido, frecuencia de fallos y antigüedad. Solo falladas incluye cualquier fallo del periodo/sesión elegidos aunque después se haya repetido bien.

## Contenidos y nuevas versiones

`src/content.json` contiene los textos literales, fuente, página y SHA256 del PDF. No incorpora notas manuscritas, recuadros de estudio ni mnemotecnias. Las viñetas no están numeradas en los PDF: `numero` indica su orden. Se conservan «vehiculo», «preveer», «de el», GLP/GNL y los signos del original, sin corrección editorial.

| Documento | Versión impresa | PT | MS |
|---|---|---|---|
| 1.01 vehículos | 1.0 · diciembre 2021 | §5.5, p.11, 9 viñetas | §6.2, p.13, 9 viñetas |
| 1.02 contenedores | 1 · diciembre 2020 | §5.5, pp.6–7, 6 viñetas | §6.2, p.8, 4 viñetas |

El nombre del PDF 1.01 termina V0.1, pero su cabecera impresa dice **1.0**; se guarda la versión impresa. Los PDF completos no se publican en el repositorio.

Para añadir 1.03 u otros, exporta el banco y sigue el mismo esquema JSON:

```json
{
  "procop_id": "IDENTIFICADOR",
  "procop_nombre": "NOMBRE DEL DOCUMENTO",
  "tipo": "PT",
  "numero": 1,
  "apartado": "EPÍGRAFE DEL ORIGINAL",
  "texto_literal": "COPIAR EXCLUSIVAMENTE DEL PDF VERIFICADO",
  "version_documento": "VERSIÓN IMPRESA",
  "revision": "FECHA.REVISIÓN",
  "fuente": {
    "archivo": "NOMBRE ORIGINAL.pdf",
    "pagina": 1,
    "sha256": "64 CARACTERES HEXADECIMALES DEL HASH REAL"
  },
  "activo": true
}
```

El ejemplo es un esquema, no contenido importable ni una pauta inventada. `iniciales` se calcula automáticamente. Calcula el hash con `sha256sum documento.pdf`. Guarda los objetos en un array y valida con `npm run content:validate -- archivo.json`.

En Procedimientos → Importar JSON se previsualizan los textos antes de confirmar. Para corregir un texto ya usado, incrementa `revision`: se archiva la anterior, se conserva la referencia dentro de cada intento y empieza un progreso nuevo. Reutilizar una revisión con un texto diferente se rechaza. Las importaciones son locales; para distribuir un banco común actualiza `src/content.json` y despliega. Un banco personalizado ya importado no se reemplaza silenciosamente al actualizar la aplicación: importa la revisión nueva explícitamente en ese dispositivo.

## GitHub Pages

Repositorio independiente: `https://github.com/Joseep27/procop-quiz`.

El workflow `.github/workflows/pages.yml` ejecuta tests, valida contenidos, compila y publica el artefacto estático con `deploy-pages`. Usa automáticamente `/<nombre-del-repositorio>/` como base.

1. En Settings → Pages → Build and deployment → Source, selecciona **GitHub Actions**.
2. En Settings → Secrets and variables → Actions → **Variables**, crea las variables públicas opcionales `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` cuando el backend nuevo esté listo.
3. Haz push a `main`, o ejecuta «Test y GitHub Pages» desde Actions.
4. Comprueba que ambos jobs terminan en verde y abre la URL que devuelve el job `deploy`.

Estas dos variables son públicas por diseño. No pongas en `VITE_*` la clave service_role, claves privadas ni credenciales Google.

El service worker conserva el HTML y assets para volver a abrir sin conexión después de una primera carga completa. Una versión nueva espera hasta cerrar todas las pestañas anteriores, evitando interrumpir borradores. IndexedDB permanece entre despliegues, pero cambia de almacén si cambia el origen web. Exporta JSON antes de cambiar de dominio. No se promete recuperación después de borrar los datos del navegador.

## Backend seguro: proyecto Supabase NUEVO

No reutilices FlamaQuiz ni otro proyecto existente. La aplicación está pensada para un único propietario del registro maestro.

1. Crea un proyecto Supabase independiente, por ejemplo `procop-quiz`. No pegues secretos en este README ni en GitHub.
2. Aplica `supabase/migrations/202611050001_quiz.sql` desde su SQL Editor, o mediante el CLI vinculado **solo al proyecto nuevo**.
3. En Authentication → Users crea tu usuario con correo/contraseña. Desactiva el registro público. La aplicación solo inicia sesión con usuarios existentes; no crea usuarios anónimos.
4. Copia el UUID del usuario nuevo. Como administrador, ejecuta en ese proyecto:

   ```sql
   insert into quiz_private.owner(singleton,user_id)
   values (true,'UUID_REAL_DEL_USUARIO');
   ```

5. Define los secretos siguientes en las Edge Functions del proyecto nuevo. Los valores `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` los suministra normalmente el entorno Supabase. Los demás deben configurarse manualmente.

| Variable servidor | Valor |
|---|---|
| `QUIZ_OWNER_ID` | UUID del mismo usuario autorizado en `quiz_private.owner` |
| `ALLOWED_ORIGIN` | Origen de Pages, sin ruta y sin barra final: `https://joseep27.github.io` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Correo de la cuenta de servicio exclusiva del quiz |
| `GOOGLE_PRIVATE_KEY` | PEM privado de esa cuenta, solo en secretos de servidor |
| `GOOGLE_SHEET_ID` | `1iGMO73Rr_LvsuyV6f6aJxs-uiGgEwOnq2NK47z9d0f4` |

6. Instala/inicia sesión en el CLI oficial de Supabase y comprueba cuidadosamente el proyecto:

   ```bash
   supabase login
   supabase link --project-ref REFERENCIA_DEL_PROYECTO_NUEVO
   supabase functions deploy sync-sheets --project-ref REFERENCIA_DEL_PROYECTO_NUEVO --no-verify-jwt
   ```

   `verify_jwt=false` no hace pública la operación: la función verifica explícitamente `auth.getUser(token)` y exige el UUID del propietario antes de acceder a datos o Google. Esta verificación permite las claves de firma actuales de Supabase.

7. Configura las dos variables Vite públicas en Pages y vuelve a desplegar. En Ajustes, inicia sesión con el usuario del paso 3.

RLS permite SELECT e INSERT solo al propietario registrado, prohíbe UPDATE/DELETE desde el cliente y mantiene las valoraciones en una tabla separada. La service_role existe únicamente en el servidor. CORS limita el origen; no sustituye a la autenticación. El dispositivo se vincula al primer UUID sincronizado para evitar mezclar cuentas.

## Conectar Google Sheets SIN tocar prioridades

No se ha ejecutado esta conexión durante la preparación si faltan credenciales. Para activarla:

1. En un proyecto Google Cloud dedicado, habilita **Google Sheets API**.
2. Crea una cuenta de servicio exclusiva del quiz y una clave JSON. Guarda su correo y `private_key` en los secretos Supabase del apartado anterior. No subas el JSON al repositorio ni lo introduzcas en la interfaz web.
3. Comparte **solo el spreadsheet indicado** con el correo de esa cuenta como Editor. No se necesita delegación de dominio ni acceso a todo Drive. Google concede permisos por archivo, no por pestaña; la función añade además una lista cerrada de dos pestañas.
4. Verifica los secretos y el origen permitido; despliega la función e inicia sesión en la app.
5. Pulsa «Sincronizar ahora». La función crea únicamente `Quiz_Intentos` y `Quiz_Resumen_Diario`, si no existen. Si ya existen con otras cabeceras, se detiene para no sobrescribir contenido ajeno.

La función no recibe desde el navegador el ID de hoja, rangos ni nombres de pestañas. Jamás escribe en «Prioridades», «Diario» ni «Instrucciones», ni actualiza prioridades.

Cada intento se guarda por UUID. Supabase asigna un número de fila estable; un reintento usa el mismo UUID y el mismo rango. El resumen usa una clave estable `día|PROCOP|apartado` y su fila asignada. Un bloqueo de servidor impide dos sincronizaciones simultáneas. Las escrituras usan `RAW`, por lo que una respuesta que empiece por `=` no se ejecuta como fórmula. Los intentos originales y todas las anotaciones quedan disponibles para ChatGPT en la hoja.

Las dos pestañas Quiz son una proyección administrada por la aplicación: no reordenes físicamente sus filas, insertes/elimine filas ni edites sus datos manualmente. Usa filtros/vistas de filtro o copia a otra pestaña si necesitas analizarlas. Nunca reutilices un proyecto Supabase nuevo contra esas pestañas antiguas sin migrar también las asignaciones de fila.

La implementación proyecta el historial completo en cada sincronización para recuperar escrituras parciales y anotaciones; impone un límite explícito de 10.000 registros por tabla y un presupuesto de tiempo. No trunca ni borra datos al alcanzar el límite: devuelve un error y requiere ampliar la estrategia. Para uso intensivo, añade un outbox servidor y sincronización incremental antes de ese límite.

## Comprobar la sincronización real

1. Exporta un JSON de respaldo. Apunta el número de intentos de la app.
2. Con conexión, responde una frase y pulsa Sincronizar. Deben aparecer fecha de respaldo Supabase y fecha confirmada de Sheets.
3. Busca el UUID de Historial en `Quiz_Intentos`; comprueba respuesta exacta, referencia, versión y diferencias. Repite la sincronización: **no debe aumentar el número de filas de intentos**.
4. Comprueba el resumen diario del mismo PROCOP/apartado. Revisa que las pestañas antiguas no han cambiado.
5. Desconecta la red después de una primera carga. Responde otra frase, sal del repaso y vuelve: el intento y borrador deben conservarse. Recupera la conexión: en sesión autenticada se reintenta al reconectar y cada 60 segundos mientras la app está abierta.
6. Simula un fallo de permisos Google retirando temporalmente el acceso de la cuenta de servicio: debe confirmarse el respaldo Supabase y mostrarse Sheets pendiente, sin perder intentos. Restablece permisos y sincroniza; no debe duplicar filas.
7. En otro navegador/dispositivo inicia sesión con la misma cuenta y sincroniza: se descargan los intentos y anotaciones del propietario. El banco personalizado se importa por separado mediante JSON.
8. Con un segundo usuario Supabase de prueba, comprueba que no puede leer/insertar intentos y que la función devuelve 403. Sin token debe devolver 401. No pruebes con proyectos de otras aplicaciones.

Si una sincronización se interrumpe tras escribir solo parte de los rangos, reintentar es seguro: las filas tienen destino determinista y solo se confirma la fecha Sheets cuando termina todo. Cuando Supabase confirma una subida, el intento local permanece guardado, aunque Google falle. Cerrar el navegador no ejecuta tareas de fondo: el reintento ocurre al volver a abrir la app.

## Estructura

```text
src/content.json                  Banco literal inicial
src/core/text.ts                  Tokens, iniciales, alineación y versiones
src/core/stats.ts                 Resúmenes y espaciado
src/core/storage.ts               IndexedDB y transacciones
src/core/sync.ts                  Cola local y respaldo remoto
src/core/export.ts                CSV seguro y descargas
src/App.tsx                      Interfaz y sesiones
supabase/migrations/              Esquema, restricciones y RLS
supabase/functions/sync-sheets/    Auth, bloqueo, Google y filas estables
tests/                           Tests automatizados
.github/workflows/pages.yml       Tests y despliegue Pages
```

## Referencias técnicas

- [Supabase: autenticación de funciones](https://supabase.com/docs/guides/functions/auth-legacy-jwt)
- [Supabase: RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Google Sheets: leer/escribir valores](https://developers.google.com/workspace/sheets/api/guides/values)
- [GitHub Pages: workflows personalizados](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

Este cuaderno es una herramienta personal de estudio, no sustituye el procedimiento oficial ni sus actualizaciones. Revisa cada revisión nueva contra su PDF antes de importarla.
