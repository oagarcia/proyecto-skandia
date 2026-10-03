# Spec: portfolio-pdf-link

**Archivo:** `src/lib/portfolio-pdf-link.ts`
**Creada:** 2026-10-03
**Última revisión:** 2026-10-03
**Estado:** ACTIVE

## Propósito

Único lugar donde se construyen los enlaces y nombres de archivo de la ficha técnica en PDF. Lo usan el cliente (`page.tsx`) y el servidor (`/api/analyze`, `/api/portfolio-pdf`), por eso no importa nada de Node.

## Dependencias

Ninguna.

---

## API Pública

### `PORTFOLIO_PDF_ENDPOINT`

Constante `'/api/portfolio-pdf'`.

### `buildPortfolioPdfEndpointUrl(portfolioName: string): string`

**Postcondiciones:**
- MUST retornar `/api/portfolio-pdf?name=<nombre>` (ruta relativa al mismo origen)
- MUST codificar el nombre con `URLSearchParams` (espacios, acentos, `&`, `#`, etc. no rompen la query)

### `buildPdfDataUrl(pdfBase64: string): string`

**Postcondiciones:**
- MUST retornar `data:application/pdf;base64,<pdfBase64>`

### `getPdfFileName(portfolioName: string): string`

**Postcondiciones:**
- MUST retornar `Ficha_Tecnica_<nombre>.pdf` reemplazando todo carácter fuera de `[a-zA-Z0-9]` por `_`

**Invariantes de seguridad:**
- `[SENTINEL]` El nombre de archivo saneado se usa en el header `Content-Disposition`; quitar comillas, `;`, saltos de línea y no-ASCII previene header injection.

---

## Test Coverage

| Regla | Archivo de test | Nombre del test | Estado |
|-------|-----------------|-----------------|--------|
| Endpoint URL relativo | `src/lib/portfolio-pdf-link.test.ts` | `"should build a same-origin endpoint URL"` | COVERED |
| Endpoint URL codificado | `src/lib/portfolio-pdf-link.test.ts` | `"should encode special characters in the name"` | COVERED |
| Data URL | `src/lib/portfolio-pdf-link.test.ts` | `"should build a PDF data URL"` | COVERED |
| Nombre de archivo saneado | `src/lib/portfolio-pdf-link.test.ts` | `"should sanitize the file name"` | COVERED |

---

## Historial de cambios

| Fecha | Cambio |
|-------|--------|
| 2026-10-03 | Spec inicial creada |
