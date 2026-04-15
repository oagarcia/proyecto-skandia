# Spec: pdf-scraper

**Archivo:** `src/lib/pdf-scraper.ts`
**Creada:** 2026-04-14
**Última revisión:** 2026-04-14
**Estado:** ACTIVE

## Propósito

Descarga la ficha técnica en PDF de un portafolio Skandia específico. Navega con Puppeteer al portal de Skandia, localiza el portafolio por nombre, extrae los parámetros de la URL del PDF y lo descarga via fetch autenticado con las cookies de la sesión del browser.

## Dependencias

- `./browser` — factory de Puppeteer Browser
- `puppeteer-core` — tipos de Browser

---

## API Pública

### `getPortfolioPdf(portfolioName: string, browserInstance?: Browser): Promise<{ pdfBase64: string | null, pdfUrl: string | null }>`

**Descripción:** Descarga el PDF de ficha técnica del portafolio indicado y lo retorna en Base64.

**Parámetros:**
- `portfolioName` — nombre exacto del portafolio tal como aparece en el portal Skandia
- `browserInstance` (opcional) — instancia de Browser reutilizable

**Postcondiciones:**

*Validación de input:*
- MUST retornar `{ pdfBase64: null, pdfUrl: null }` si `portfolioName` está vacío o es falsy
- MUST retornar `{ pdfBase64: null, pdfUrl: null }` si `portfolioName.length > 200`

*Flujo de navegación:*
- MUST navegar a `https://portal.skandia.com.co/om.rentabilidades.pl/oldmutual`
- MUST retornar `{ pdfBase64: null, pdfUrl: null }` si el portafolio no se encuentra en la página
- MUST retornar `{ pdfBase64: null, pdfUrl: null }` si faltan los parámetros requeridos (origin, idPortfolio, idProduct)

*Descarga:*
- MUST construir la URL del PDF usando `URLSearchParams` (no concatenación de strings)
- MUST incluir las cookies de la sesión del browser en el header de la petición fetch
- MUST usar un timeout de 30 segundos para el fetch del PDF (`AbortSignal.timeout(30000)`)
- MUST retornar `{ pdfBase64: null, pdfUrl: null }` si la respuesta no tiene firma `%PDF` ni content-type de PDF

*Respuesta exitosa:*
- MUST retornar el PDF en Base64 en `pdfBase64`
- MUST retornar la URL del Security.aspx en `pdfUrl`
- En cualquier error (Puppeteer, fetch, parseo), MUST retornar `{ pdfBase64: null, pdfUrl: null }` sin lanzar excepción

*Manejo de browser:*
- MUST lanzar un nuevo browser si no se provee `browserInstance`
- MUST cerrar el browser propio al terminar, pero NO cerrar el browser externo

**Invariantes de seguridad:**
- `[SENTINEL]` Limitar `portfolioName` a 200 caracteres previene DoS via nombres extremadamente largos que podrían causar problemas en `page.evaluate()` de Puppeteer.
- `[SENTINEL]` No loguear el buffer raw de la respuesta para prevenir disclosure de datos sensibles del PDF.
- `[SENTINEL]` `AbortSignal.timeout(30000)` previene que el fetch cuelgue indefinidamente (DoS por hang).
- `[SENTINEL]` `URLSearchParams` para construir la URL del PDF previene SSRF y URLs malformadas.

---

## Test Coverage

| Regla | Archivo de test | Nombre del test | Estado |
|-------|-----------------|-----------------|--------|
| MUST retornar null para nombre vacío | `src/lib/pdf-scraper.test.ts` | `"should return null result for empty portfolio name"` | COVERED |
| MUST retornar null para nombre > 200 chars | `src/lib/pdf-scraper.test.ts` | `"should return null result for portfolio name over 200 chars"` | COVERED |
| Navegación a Skandia y descarga de PDF | *(integración)* | — | N/A |

---

## Gaps y decisiones pendientes

<!-- GAP: El período de la ficha técnica está hardcodeado como '1'. Si Skandia cambia los valores de período, la URL del PDF fallará silenciosamente. -->
<!-- GAP: `page.waitForSelector('div[id^="numberOfRow"]', { timeout: 10000 })` puede fallar si el portal Skandia tarda más de 10 segundos. No hay retry logic. -->
