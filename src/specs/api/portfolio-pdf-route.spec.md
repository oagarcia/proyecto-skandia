# Spec: API Route /api/portfolio-pdf

**Archivo:** `src/app/api/portfolio-pdf/route.ts`
**Creada:** 2026-10-03
**Última revisión:** 2026-10-03
**Estado:** ACTIVE

## Propósito

Sirve la ficha técnica en PDF de un portafolio para abrirla en una pestaña nueva (botón "Ficha" de `PortfolioCard`). Usa el mismo `fetchPortfolioPdf` que `/api/analyze`, sin browser.

---

## Contrato HTTP

### `GET /api/portfolio-pdf?name=<nombre>`

El cliente construye la URL con `buildPortfolioPdfEndpointUrl` (`src/lib/portfolio-pdf-link.ts`).

**Flujo (en orden):**

1. Rate limit: 20 req/min por IP → `429`
2. `name` inválido (`validatePortfolioName`) → `400`
3. `fetchPortfolioPdf(name)` retorna `null` → `404`
4. Éxito → `200` con el PDF binario

**Responses:**

| Status | Condición | Body |
|--------|-----------|------|
| 200 | Éxito | PDF binario |
| 400 | Nombre inválido | `{ success: false, error: string }` |
| 404 | PDF no disponible | `{ success: false, error: "PDF not available for this portfolio." }` |
| 429 | Rate limit | `{ success: false, error: "Too many requests..." }` |
| 500 | Error interno | `{ success: false, error: "An internal error occurred..." }` |

**Postcondiciones:**
- MUST responder `429` si `checkRateLimit(ip, 20, 60000)` es falso, sin llamar al scraper
- MUST responder `400` si `validatePortfolioName` falla, sin llamar al scraper
- MUST responder `404` si `fetchPortfolioPdf` retorna `null`
- MUST responder `200` con headers `Content-Type: application/pdf`, `Content-Disposition: inline; filename="<getPdfFileName(name)>"`, `X-Content-Type-Options: nosniff` y `Cache-Control: private, max-age=3600`
- MUST responder `500` con mensaje genérico si ocurre una excepción

**Invariantes de seguridad:**
- `[SENTINEL]` Rate limit de 20 req/min por IP: cada request descarga hasta dos PDFs del portal.
- `[SENTINEL]` `validatePortfolioName` (allow-list `SAFE_TEXT_REGEX`, máx. 100 chars) antes de tocar el portal.
- `[SENTINEL]` `X-Content-Type-Options: nosniff` evita que el navegador interprete el cuerpo como HTML si el portal devolviera otra cosa.
- `[SENTINEL]` El nombre de archivo de `Content-Disposition` viene de `getPdfFileName` (saneado), previene header injection.
- Errores internos retornan mensaje genérico, sin stack traces.

---

## Test Coverage

| Regla | Archivo de test | Nombre del test | Estado |
|-------|-----------------|-----------------|--------|
| MUST 429 por rate limit | `src/app/api/portfolio-pdf/route.test.ts` | `"should return 429 when rate limited"` | COVERED |
| MUST 400 por nombre inválido | `src/app/api/portfolio-pdf/route.test.ts` | `"should return 400 for an invalid name"` | COVERED |
| MUST 404 si no hay PDF | `src/app/api/portfolio-pdf/route.test.ts` | `"should return 404 when the PDF is not available"` | COVERED |
| MUST 200 con headers | `src/app/api/portfolio-pdf/route.test.ts` | `"should return the PDF inline with safe headers"` | COVERED |
| MUST 500 genérico | `src/app/api/portfolio-pdf/route.test.ts` | `"should return a generic 500 on unexpected errors"` | COVERED |

---

## Historial de cambios

| Fecha | Cambio |
|-------|--------|
| 2026-10-03 | Spec inicial creada |
