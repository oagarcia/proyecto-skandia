# Spec: yahoo-finance

**Archivo:** `src/lib/yahoo-finance.ts`
**Creada:** 2026-04-14
**Última revisión:** 2026-04-14
**Estado:** ACTIVE

## Propósito

Wrapper sobre Yahoo Finance para obtener noticias financieras relacionadas con los holdings de un portafolio. Valida las URLs retornadas por Yahoo para prevenir ataques SSRF antes de hacer fetch de su contenido.

## Dependencias

- `@/config/yahoo-finance-settings` — mapeo de nombre de portafolio a símbolos de mercado (tickers)

---

## API Pública

### `getYahooFinanceNews(portfolioName: string): Promise<string>`

**Descripción:** Busca noticias en Yahoo Finance para los símbolos de mercado asociados al portafolio dado.

**Postcondiciones:**
- MUST retornar string con noticias formateadas en markdown, o string vacío si no hay noticias
- MUST validar cada URL de noticia antes de hacer fetch de su contenido
- MUST rechazar URLs que no cumplan el contrato: hostname `finance.yahoo.com` y pathname comenzando con `/news/` o `/m/`
- MUST retornar string vacío (no lanzar) si el portafolio no tiene símbolos configurados
- En caso de error de red o fetch, MUST retornar string vacío sin lanzar excepción

**Invariantes de seguridad:**
- `[SENTINEL]` Validación de URLs antes de fetch: solo se permiten URLs de `finance.yahoo.com` con rutas `/news/*` o `/m/*`. Esto previene que respuestas de Yahoo contengan URLs maliciosas que apunten a servidores internos (SSRF) o dominios atacantes.

---

## Test Coverage

| Regla | Archivo de test | Nombre del test | Estado |
|-------|-----------------|-----------------|--------|
| MUST validar URLs de Yahoo Finance (anti-SSRF) | `tests/test-ssrf.test.ts` | `"should validate proper URLs and reject SSRF attempts"` | COVERED |
| MUST retornar string vacío para portafolios sin símbolos | *(pendiente)* | — | MISSING |
| Fetch de noticias reales de Yahoo | *(integración)* | — | N/A |

---

## Gaps y decisiones pendientes

<!-- GAP: El test de SSRF en test-ssrf.test.ts verifica la función de validación inline, no la función exportada del módulo. Si se refactoriza la validación, el test no detectaría la regresión automáticamente. -->
<!-- GAP: No hay rate limiting para las peticiones a Yahoo Finance. En análisis de muchos portafolios en paralelo, Yahoo podría bloquear la IP del servidor. -->
