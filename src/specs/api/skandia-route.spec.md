# Spec: API Route /api/skandia

**Archivo:** `src/app/api/skandia/route.ts`
**Creada:** 2026-04-14
**Última revisión:** 2026-04-14
**Estado:** ACTIVE

## Propósito

Endpoint que hace scraping del portal de Skandia Colombia para extraer las rentabilidades de todos los portafolios disponibles. Es el endpoint principal que alimenta el dashboard de la UI.

---

## Contrato HTTP

### `GET /api/skandia`

**Query params (opcionales):**

| Param | Formato | Default |
|-------|---------|---------|
| `from` | `YYYY-MM-DD` | Primer día del mes actual |
| `to` | `YYYY-MM-DD` | Último día del mes actual |

**Flujo de validaciones (en orden):**

1. Rate limit: 20 req/min por IP → `429`
2. `from` inválido (formato) → `400`
3. `to` inválido (formato) → `400`
4. `from > to` → `400`

**Responses:**

| Status | Condición | Body |
|--------|-----------|------|
| 200 | Éxito | `{ success: true, portfolios: Portfolio[] }` |
| 400 | Fecha inválida o from > to | `{ success: false, error: string }` |
| 429 | Rate limit | `{ success: false, error: "Too many requests..." }` |
| 500 | Error de scraping | `{ success: false, error: string }` |

**Scraping:**
- MUST navegar a `https://portal.skandia.com.co/om.rentabilidades.pl/oldmutual`
- MUST extraer datos de 3 tablas: `tableData1`, `tableData2`, `tableData3`
- Cada tabla corresponde a una categoría: Portafolios Abiertos, a la Medida, Especiales
- MUST mapear las imágenes de perfil de riesgo a strings:
  - `pRiesgo1` → `"Conservador"`
  - `pRiesgo2` → `"Moderado"`
  - `pRiesgo3` → `"Agresivo"`
- MUST cerrar el browser al terminar (success o error)

**Campos del Portfolio extraído:**
- `name` — nombre del portafolio
- `type` — tipo (RV, RF, IA, etc.)
- `risk` — perfil de riesgo (Conservador, Moderado, Agresivo)
- `value` — valor del portafolio
- `returns.daily`, `returns.monthly`, `returns.sixMonths`, `returns.yearly` — rentabilidades

**Invariantes de seguridad:**
- `[SENTINEL]` Rate limit de 20 req/min por IP para proteger contra abuso del scraping costoso
- Las fechas `from` y `to` se validan con `isValidDate` (que usa UTC, previene overflow de fechas)

---

## Test Coverage

| Dependencia validada | Estado |
|---------------------|--------|
| `isValidDate` | COVERED (via validation.test.ts) |
| `checkRateLimit` / `getClientIp` | COVERED (via rate-limit.test.ts) |
| Scraping de portal Skandia | MISSING (requiere integración) |
