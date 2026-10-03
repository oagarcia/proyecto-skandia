# Spec: pdf-scraper

**Archivo:** `src/lib/pdf-scraper.ts`
**Creada:** 2026-04-14
**Última revisión:** 2026-10-03
**Estado:** ACTIVE

## Propósito

Descarga la ficha técnica en PDF de un portafolio Skandia específico usando solo HTTP (sin Puppeteer). Obtiene el HTML de la página de rentabilidades, extrae del catálogo embebido (`data = [...]`) los parámetros del portafolio y descarga el PDF desde `Security.aspx`, siguiendo la cadena de redirecciones con las cookies de sesión que esa misma cadena establece.

Es la única fuente de PDFs de la app: la usan `/api/analyze` (PDF embebido como `data:` URL) y `/api/portfolio-pdf` (botón "Ficha" de cada tarjeta).

## Dependencias

- `./pdf-parser` — `pdfHasHoldingsData` para validar el PDF del período más reciente

## Flujo verificado en el portal (2026-10-03)

1. `GET /om.rentabilidades.pl/oldmutual` → HTML con `data = [{ CategoryName, Products: [{ Id, Origen, ProductName, Portfolios: [{ Id, LongName, ... }] }] }]`.
2. `GET Security.aspx?Origen=<Product.Origen>&Period=<0|1>&IdVariable=<Portfolio.Id>&Product=<Product.Id>` → `302` + `Set-Cookie: ASP.NET_SessionId, Manual_F5` → `OpenFile.aspx` → `302` → `ViewPDF.aspx?file=...` → PDF (servido con `Content-Type: text/html`).
3. Sin reenviar las cookies entre saltos, la cadena termina en el HTML de `OpenFile.aspx` (no en el PDF).

---

## API Pública

### `parsePortfolioCatalog(html: string): PortfolioCatalog | null`

**Descripción:** Extrae y parsea el arreglo JSON `data = [...]` embebido en el HTML de la página de rentabilidades.

**Postcondiciones:**
- MUST retornar el arreglo parseado cuando el HTML contiene `data = [...]` con JSON válido
- MUST respetar strings JSON al buscar el `]` de cierre (corchetes dentro de strings no cierran el arreglo)
- MUST retornar `null` si no encuentra el marcador, si el arreglo no cierra o si el JSON es inválido (nunca lanza)

---

### `findPortfolioPdfParams(catalog: PortfolioCatalog, portfolioName: string): PdfParams | null`

**Descripción:** Busca el portafolio por nombre y retorna `{ origin, idPortfolio, idProduct }`.

**Postcondiciones:**
- MUST buscar solo en `catalog[0]` (Skandia Pensiones y Cesantías S.A.), el mismo alcance que `/api/skandia`; otras categorías tienen nombres duplicados
- MUST hacer match exacto de `Portfolio.LongName === portfolioName`
- MUST mapear `Product.Origen` → `origin`, `Portfolio.Id` → `idPortfolio`, `Product.Id` → `idProduct`
- MUST retornar `null` si el portafolio no existe o si alguno de los tres parámetros está vacío

---

### `fetchPortfolioPdf(portfolioName: string): Promise<{ buffer: Buffer, url: string } | null>`

**Descripción:** Núcleo de descarga. Retorna el PDF elegido y la URL de `Security.aspx` usada.

**Postcondiciones:**

*Validación de input:*
- MUST retornar `null` si `portfolioName` está vacío o es falsy
- MUST retornar `null` si `portfolioName.length > 200`

*Catálogo:*
- MUST obtener `https://portal.skandia.com.co/om.rentabilidades.pl/oldmutual` con `fetch` (sin browser)
- MUST retornar `null` si la página no responde OK, si el catálogo no se puede parsear o si el portafolio no se encuentra

*Selección de período:*
- MUST intentar primero el período `'0'` (mes más reciente)
- MUST usar el PDF del período `'0'` solo si contiene al menos un holding extraíble en "Principales inversiones del portafolio" (`pdfHasHoldingsData`); el título por sí solo no basta, porque los meses sin publicar traen una plantilla vacía
- MUST caer al período `'1'` (mes anterior) si el PDF del período `'0'` no tiene holdings, o si su descarga falla (status no OK, timeout, respuesta que no es PDF)

*Descarga:*
- MUST construir la URL del PDF usando `URLSearchParams` (no concatenación de strings)
- MUST seguir las redirecciones manualmente (`redirect: 'manual'`) reenviando en cada salto las cookies recibidas en `Set-Cookie`
- MUST seguir como máximo 5 redirecciones
- MUST abortar la cadena si un `Location` apunta fuera de `https://portal.skandia.com.co`
- MUST usar un timeout de 30 segundos para cada request (`AbortSignal.timeout(30000)`)
- MUST retornar `null` para el período si los primeros 1024 bytes del cuerpo no contienen la firma `%PDF` (el portal sirve el PDF como `text/html`, así que no se confía en el `Content-Type`)
- MUST descartar respuestas de más de 20 MB

*Errores:*
- En cualquier error (red, parseo, timeout), MUST retornar `null` sin lanzar excepción

**Invariantes de seguridad:**
- `[SENTINEL]` Limitar `portfolioName` a 200 caracteres previene DoS via nombres extremadamente largos.
- `[SENTINEL]` No loguear el buffer raw de la respuesta para prevenir disclosure de datos sensibles del PDF.
- `[SENTINEL]` `AbortSignal.timeout(30000)` previene que un fetch cuelgue indefinidamente (DoS por hang).
- `[SENTINEL]` `URLSearchParams` para construir la URL del PDF previene SSRF y URLs malformadas.
- `[SENTINEL]` Solo se siguen redirecciones hacia `https://portal.skandia.com.co`, para que un `Location` manipulado no convierta el servidor en proxy hacia otros hosts (SSRF via open redirect) ni le entregue las cookies de sesión a terceros.
- `[SENTINEL]` Límite de 5 redirecciones previene loops de redirección (DoS).
- `[SENTINEL]` Límite de 20 MB por PDF previene agotamiento de memoria con respuestas gigantes.

---

### `getPortfolioPdf(portfolioName: string): Promise<{ pdfBase64: string | null, pdfUrl: string | null }>`

**Descripción:** Wrapper de `fetchPortfolioPdf` usado por `/api/analyze`.

**Postcondiciones:**
- MUST retornar el PDF en Base64 en `pdfBase64` y la URL de `Security.aspx` en `pdfUrl` cuando `fetchPortfolioPdf` tiene éxito
- MUST retornar `{ pdfBase64: null, pdfUrl: null }` cuando `fetchPortfolioPdf` retorna `null` (incluye nombre vacío o > 200 chars)
- MUST no lanzar excepción

---

## Test Coverage

| Regla | Archivo de test | Nombre del test | Estado |
|-------|-----------------|-----------------|--------|
| MUST retornar null para nombre vacío | `src/lib/pdf-scraper.test.ts` | `"should return null result for empty portfolio name"` | COVERED |
| MUST retornar null para nombre > 200 chars | `src/lib/pdf-scraper.test.ts` | `"should return null result for portfolio name over 200 characters"` | COVERED |
| `getPortfolioPdf` nunca lanza | `src/lib/pdf-scraper.test.ts` | `"should never throw an exception regardless of input"` | COVERED |
| `parsePortfolioCatalog` parsea `data = [...]` | `src/lib/pdf-scraper.test.ts` | `"should parse the embedded data array"` | COVERED |
| `parsePortfolioCatalog` respeta strings | `src/lib/pdf-scraper.test.ts` | `"should ignore brackets inside JSON strings"` | COVERED |
| `parsePortfolioCatalog` retorna null | `src/lib/pdf-scraper.test.ts` | `"should return null for missing marker, unterminated array or invalid JSON"` | COVERED |
| `findPortfolioPdfParams` mapea parámetros | `src/lib/pdf-scraper.test.ts` | `"should map product and portfolio ids to PDF params"` | COVERED |
| `findPortfolioPdfParams` solo `catalog[0]` | `src/lib/pdf-scraper.test.ts` | `"should only search the first category"` | COVERED |
| `findPortfolioPdfParams` null si falta / vacío | `src/lib/pdf-scraper.test.ts` | `"should return null for unknown portfolio or empty params"` | COVERED |
| Catálogo vía fetch; null si no OK | `src/lib/pdf-scraper.test.ts` | `"should return null when the catalog page fails"` | COVERED |
| Reenvía cookies entre redirecciones + URLSearchParams | `src/lib/pdf-scraper.test.ts` | `"should forward session cookies across redirects"` | COVERED |
| Aborta redirecciones fuera del portal | `src/lib/pdf-scraper.test.ts` | `"should not follow redirects to other hosts"` | COVERED |
| Máximo 5 redirecciones | `src/lib/pdf-scraper.test.ts` | `"should stop after 5 redirects"` | COVERED |
| Timeout de 30s por request | `src/lib/pdf-scraper.test.ts` | `"should pass an abort signal to every request"` | COVERED |
| Rechaza cuerpo sin `%PDF` | `src/lib/pdf-scraper.test.ts` | `"should reject responses without a PDF signature"` | COVERED |
| Rechaza > 20 MB | `src/lib/pdf-scraper.test.ts` | `"should reject PDFs larger than 20 MB"` | COVERED |
| Usa período 0 si tiene holdings | `src/lib/pdf-scraper.test.ts` | `"should use period 0 when it has holdings"` | COVERED |
| Cae a período 1 sin holdings / si falla | `src/lib/pdf-scraper.test.ts` | `"should fall back to period 1 when period 0 has no holdings or fails"` | COVERED |
| `getPortfolioPdf` retorna base64 + URL | `src/lib/pdf-scraper.test.ts` | `"should return base64 and Security.aspx URL on success"` | COVERED |

---

## Gaps y decisiones pendientes

<!-- GAP: Los valores de período ('0' = mes actual, '1' = mes anterior) están hardcodeados (coinciden con el <select id="date"> del portal). Si Skandia cambia su semántica, la selección fallará silenciosamente. -->
<!-- GAP: Cuando el período '0' no es usable se hacen dos descargas por PDF. -->
<!-- GAP: Depende del nombre de variable `data` en un <script> inline del portal (igual que /api/skandia). Si Skandia lo renombra, ambos fallan. -->

---

## Historial de cambios

| Fecha | Cambio |
|-------|--------|
| 2026-04-14 | Spec inicial creada |
| 2026-10-03 | Selección de período: el período `'0'` se valida con `pdfHasHoldingsData` (al menos un holding) en lugar de solo la presencia del título de la sección |
| 2026-10-03 | Se elimina Puppeteer: parámetros desde el catálogo `data` del HTML y cookies de sesión tomadas de la cadena de redirecciones de `Security.aspx`. Nuevas funciones `parsePortfolioCatalog`, `findPortfolioPdfParams`, `fetchPortfolioPdf`; `getPortfolioPdf` pierde el parámetro `browserInstance`. Nuevos `[SENTINEL]` de redirecciones y tamaño |
