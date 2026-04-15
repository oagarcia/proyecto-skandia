# Spec: pdf-parser

**Archivo:** `src/lib/pdf-parser.ts`
**Creada:** 2026-04-14
**Última revisión:** 2026-04-14
**Estado:** ACTIVE

## Propósito

Extrae los nombres de los principales holdings (inversiones) desde el PDF de la ficha técnica de un portafolio Skandia. Los holdings extraídos se usan como queries para buscar noticias relevantes en Google News.

## Dependencias

- `pdf-parse/lib/pdf-parse.js` — librería de parseo de PDF (importada con `require` por compatibilidad)

---

## API Pública

### `extractHoldingsFromPdf(pdfBuffer: Buffer): Promise<string[]>`

**Descripción:** Parsea un buffer de PDF y extrae los nombres de los holdings de la sección "Principales inversiones del portafolio".

**Precondiciones:**
- `pdfBuffer` debe ser un Buffer válido (puede ser un PDF corrupto o vacío)

**Postcondiciones:**
- MUST retornar `[]` (array vacío) si la sección "Principales inversiones del portafolio" no se encuentra en el texto del PDF
- MUST retornar `[]` (array vacío, sin lanzar excepción) si ocurre cualquier error durante el parseo
- MUST retornar máximo 10 holdings (el proceso de captura se detiene al llegar a 10)
- SHOULD extraer solo líneas que terminen en un porcentaje (ej: `33.09%`) como holdings candidatos
- SHOULD limpiar el nombre eliminando porcentajes finales y palabras clave de tipo de inversión (`Rv. Internacional`, `Derivados`, `Liquidez`, etc.)
- SHOULD filtrar líneas de ruido con nombre de 3 caracteres o menos
- MAY retornar menos de 10 holdings si el PDF tiene menos entradas en esa sección

**Invariantes de seguridad:**
- No registra el contenido completo del PDF en logs (solo los holdings extraídos)
- Los errores se capturan y retornan como array vacío, no se propagan al caller

---

## Test Coverage

| Regla | Archivo de test | Nombre del test | Estado |
|-------|-----------------|-----------------|--------|
| MUST retornar [] si sección no encontrada | `src/lib/pdf-parser.test.ts` | `"should return empty array when section marker is not found"` | COVERED |
| MUST retornar [] en error de parseo | `src/lib/pdf-parser.test.ts` | `"should return empty array on parse error without throwing"` | COVERED |
| MUST limitar a 10 holdings máximo | `src/lib/pdf-parser.test.ts` | `"should return at most 10 holdings"` | COVERED |
| SHOULD extraer holdings de líneas con % | `src/lib/pdf-parser.test.ts` | `"should extract holdings from lines ending in percentage"` | COVERED |
| SHOULD limpiar tipo de inversión del nombre | `src/lib/pdf-parser.test.ts` | `"should strip type keywords from holding names"` | COVERED |

---

## Gaps y decisiones pendientes

<!-- GAP: La heurística de extracción es frágil y depende del layout que pdf-parse produce para los PDFs de Skandia. Si Skandia cambia el formato del PDF, la extracción puede fallar silenciosamente (retornando []). No hay forma de distinguir "PDF sin holdings" de "PDF con holdings en formato no reconocido". -->
<!-- GAP: `require('pdf-parse/lib/pdf-parse.js')` en lugar de `import` puede causar problemas con ESM en versiones futuras de Next.js. Documentado para migración futura. -->
