# Spec: API Route /api/models

**Archivo:** `src/app/api/models/route.ts`
**Creada:** 2026-04-14
**Última revisión:** 2026-04-14
**Estado:** ACTIVE

## Propósito

Endpoint que lista los modelos de Google Generative AI disponibles para una API Key dada. Se usa para poblar el selector de modelos en la UI.

---

## Contrato HTTP

### `POST /api/models`

**Request body:**
```json
{ "apiKey": "string" }
```

**Flujo de validaciones (en orden):**

1. Rate limit: 20 req/min por IP → `429 Too Many Requests`
2. `apiKey` ausente → `400 Bad Request` (`"API Key is required"`)
3. `apiKey` inválida (formato) → `400 Bad Request` (error de validateApiKey)
4. Error de Google API → `status` de Google + mensaje sanitizado
5. Éxito → `200 OK` con lista de modelos

**Responses:**

| Status | Condición | Body |
|--------|-----------|------|
| 200 | Éxito | `{ success: true, models: string[] }` |
| 400 | apiKey ausente o inválida | `{ success: false, error: string }` |
| 429 | Rate limit excedido | `{ success: false, error: "Too many requests..." }` |
| 500 | Error interno | `{ success: false, error: "Internal server error" }` |

**Filtrado de modelos:**
- MUST filtrar solo modelos cuyo nombre incluya `"gemini"` y soporten `"generateContent"`
- MUST remover el prefijo `"models/"` de los nombres retornados
- MUST ordenar por versión descendente (sort alphabético invertido)

**Invariantes de seguridad:**
- `[SENTINEL]` La API Key se envía en header `x-goog-api-key`, no como query parameter, para prevenir leakage en URLs (CWE-598)
- `[SENTINEL]` Los mensajes de error de Google se sanitizan antes de retornarlos al cliente para no exponer información interna
- `[SENTINEL]` `AbortSignal.timeout(15000)` previene DoS por conexiones colgadas al API de Google

---

## Test Coverage

> Las rutas API requieren Next.js runtime para testing. Se verifican por:
> 1. Tests unitarios de las funciones de validación que usan (`validateApiKey`, `checkRateLimit`)
> 2. Revisión manual de la ruta al deployer en Vercel

| Regla | Estado |
|-------|--------|
| validateApiKey cubre la validación de apiKey | COVERED (via validation.test.ts) |
| checkRateLimit cubre el rate limiting | COVERED (via rate-limit.test.ts) |
| Filtrado de modelos | MISSING (unit test de ruta) |
