# Spec: API Route /api/analyze

**Archivo:** `src/app/api/analyze/route.ts`
**Creada:** 2026-04-14
**Última revisión:** 2026-04-14
**Estado:** ACTIVE

## Propósito

Endpoint principal de análisis. Recibe un portafolio, una API Key de Gemini y un modelo opcional. Orquesta la obtención de contexto (PDF, Yahoo Finance, Google News) y genera un análisis financiero completo usando Gemini AI.

---

## Contrato HTTP

### `POST /api/analyze`

**Request body:**
```json
{
  "portfolio": Portfolio,
  "apiKey": "string",
  "model": "string (opcional)"
}
```

**Flujo de validaciones y ejecución (en orden):**

1. Rate limit: 20 req/min por IP → `429`
2. `apiKey` ausente → `400`
3. `apiKey` inválida (formato) → `400`
4. `model` inválido (no en allowedModels) → `400`
5. `portfolio` inválido (estructura, caracteres, longitudes) → `400`
6. Lanzar browser compartido (best-effort, falla silenciosa con fallback a instancias individuales)
7. **Fetching paralelo:** PDF + Yahoo Finance se inician simultáneamente
8. Google News: busca noticias específicas. Si retorna vacío, hace fallback a query genérico del portafolio
9. Selección de modelo: usa `selectedModel` si se provee, o prueba lista de modelos en orden
10. Genera análisis con Gemini (incluyendo PDF como Part si está disponible)
11. Retorna el análisis en markdown

**Responses:**

| Status | Condición | Body |
|--------|-----------|------|
| 200 | Éxito | `{ success: true, analysis: string (markdown) }` |
| 400 | Validación fallida | `{ success: false, error: string }` |
| 429 | Rate limit | `{ success: false, error: "Too many requests..." }` |
| 500 | Error interno | `{ success: false, error: "Internal server error" }` |

**Fetching paralelo (Fase 7 del flujo):**
- MUST iniciar `getPortfolioPdf()` y Yahoo Finance en paralelo (`Promise.all`)
- SHOULD continuar aunque alguno falle (los datos son opcionales para el análisis)

**Lógica de noticias (Google News):**
- Extrae holdings del PDF → genera queries de noticias por holding
- Si hay noticias: las incluye en el prompt
- Si no hay noticias de holdings: busca noticias del portafolio por nombre
- Si tampoco hay: usa query genérico de mercado colombiano

**Selección de modelo Gemini:**
- Si `selectedModel` está provisto y validado: usa ese modelo
- Si no: intenta modelos de la lista `allowedModels` en orden, con manejo de errores 429 (rate limit de Google)

**Invariantes de seguridad:**
- `[SENTINEL]` Rate limit: 20 req/min por IP
- `[SENTINEL]` Todos los inputs pasan por `validatePortfolio`, `validateApiKey`, `validateModel` antes de procesarse
- Errores internos retornan mensaje genérico, sin stack traces ni detalles de implementación

---

## Campos del prompt enviado a Gemini

El prompt incluye:
- Nombre, tipo, perfil de riesgo del portafolio
- Rentabilidades: diaria, mensual, 6 meses, anual
- Score preliminar y recomendación de `analyzePortfolio`
- Noticias del mercado (de Google News o Yahoo Finance)
- Ficha técnica en PDF (si disponible)

El análisis Gemini MUST generar secciones: Resumen, Rentabilidad, Perfil de Riesgo, Composición, Noticias del Mercado, Veredicto Final.

---

## Test Coverage

> Las rutas API requieren Next.js runtime. Se verifican por tests unitarios de sus dependencias.

| Dependencia validada | Estado |
|---------------------|--------|
| `validateApiKey` | COVERED (via validation.test.ts) |
| `validateModel` | COVERED (via validation.test.ts) |
| `validatePortfolio` | COVERED (via validation.test.ts) |
| `checkRateLimit` | COVERED (via rate-limit.test.ts) |
| `getPortfolioPdf` | COVERED (input validation via pdf-scraper.test.ts) |
| `searchGoogleNews` | COVERED (input validation via news-scraper.test.ts) |
| `extractHoldingsFromPdf` | COVERED (via pdf-parser.test.ts) |

---

## Gaps y decisiones pendientes

<!-- GAP: El comentario en el código dice "5 requests per minute" pero el código implementa 20. El comentario está desactualizado. -->
<!-- GAP: No hay timeout para la llamada a Gemini. Si el modelo tarda demasiado, la request puede colgar. -->
<!-- GAP: El fallback de modelo (iterar allowedModels) puede causar latencia significativa si varios modelos retornan 429 de Google. -->
