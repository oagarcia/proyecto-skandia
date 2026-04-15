# Spec: news-scraper

**Archivo:** `src/lib/news-scraper.ts`
**Creada:** 2026-04-14
**Última revisión:** 2026-04-14
**Estado:** ACTIVE

## Propósito

Busca noticias recientes en Google News para un query dado, usando Puppeteer para navegar el DOM. Los resultados se incluyen en el prompt de Gemini AI para proveer contexto de mercado actual.

## Dependencias

- `./browser` — factory de Puppeteer Browser
- `puppeteer-core` — tipos de Browser

---

## API Pública

### `searchGoogleNews(query: string, browserInstance?: Browser): Promise<string>`

**Descripción:** Navega a Google News con el query dado y extrae las primeras 5 noticias como string formateado en markdown.

**Parámetros:**
- `query` — término de búsqueda (nombre del portafolio, holdings, etc.)
- `browserInstance` (opcional) — instancia de Browser reutilizable. Si no se provee, se lanza uno nuevo y se cierra al terminar (patrón `ownBrowser`)

**Postcondiciones:**

*Validación de input:*
- MUST truncar el query a 200 caracteres si excede ese límite (no rechazar — truncar)
- MUST retornar un mensaje de error descriptivo en español si el query queda vacío después del truncado

*URL construction:*
- MUST construir la URL de búsqueda usando `URLSearchParams` (no concatenación de strings)
- MUST incluir parámetros: `tbm=nws` (news), `hl=en`, `gl=US`, `tbs=qdr:m` (último mes)

*Manejo de browser:*
- MUST lanzar un nuevo browser si no se provee `browserInstance`
- MUST cerrar el browser propio al terminar (éxito o error), pero NO cerrar el browser externo

*Resultado:*
- MUST retornar string en formato markdown con cada noticia como `- **Título** (Fuente, Fecha): Snippet`
- MUST limitar a máximo 5 noticias
- SHOULD retornar string vacío si no se encuentran noticias (no retornar array)
- En caso de error de Puppeteer, MUST retornar mensaje de error en español (no lanzar excepción)

**Invariantes de seguridad:**
- `[SENTINEL]` Limitar el query a 200 caracteres previene DoS via queries extremadamente largas que podrían causar consumo excesivo de memoria en Puppeteer o timeouts en servicios externos.
- `[SENTINEL]` Usar `URLSearchParams` para construir el query string previene SSRF y URLs malformadas por encoding automático de parámetros.

---

## Test Coverage

| Regla | Archivo de test | Nombre del test | Estado |
|-------|-----------------|-----------------|--------|
| MUST truncar query > 200 chars | `src/lib/news-scraper.test.ts` | `"should truncate queries over 200 characters"` | COVERED |
| MUST retornar error message para query vacío | `src/lib/news-scraper.test.ts` | `"should return error message for empty query"` | COVERED |
| MUST lanzar/cerrar browser si no se provee uno | *(integración)* | — | N/A |

---

## Gaps y decisiones pendientes

<!-- GAP: Los selectores CSS de Google News (`div.SoaBEf`, `div.MjjYud`, etc.) son frágiles y pueden cambiar en cualquier actualización de Google. No hay mecanismo de alerta cuando los selectores fallan — simplemente retorna 0 noticias. -->
<!-- GAP: No hay timeout explícito para `page.goto()`. El default de Puppeteer es 30 segundos. -->
