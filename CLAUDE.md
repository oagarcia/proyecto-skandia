# CLAUDE.md

Instrucciones de proyecto para Claude Code al trabajar en **Skandia Intelligence App**. Este archivo se carga automáticamente en cada sesión.

## Qué es este proyecto

App Next.js 16 / React 19 / TypeScript de inteligencia financiera para portafolios Skandia Colombia: scraping (Puppeteer + `pdf-parse`), análisis con Google Gemini, visualización con Recharts. Ver `README.md` para arquitectura completa.

## Metodología: Specification-Driven Development (SDD)

Este proyecto sigue SDD. **Toda la lógica de negocio no trivial en `src/lib/`, `src/app/api/` y `src/config/` debe tener una spec en `src/specs/` que la respalde**, con la misma ruta relativa (ej: `src/lib/pdf-parser.ts` → `src/specs/lib/pdf-parser.spec.md`).

El formato de spec está en `src/specs/_template.spec.md` y el estado de cobertura global en `src/specs/_index.md`. Léelos antes de tocar cualquier módulo con spec existente.

### Regla obligatoria al modificar un módulo existente que tiene spec

Cuando cambies el comportamiento de una función documentada en una spec (no solo un refactor interno sin cambio observable):

1. **Lee la spec correspondiente primero** (`src/specs/.../<módulo>.spec.md`) antes de escribir código.
2. Si el cambio altera precondiciones, postcondiciones (`MUST`/`SHOULD`/`MAY`), casos de error o invariantes de seguridad → **actualiza la spec en el mismo cambio**, no después:
   - Actualiza `**Última revisión:**` a la fecha de hoy.
   - Agrega una fila en `## Historial de cambios`.
   - Si el estado del módulo cambia (DRAFT/ACTIVE/DEPRECATED), actualízalo.
3. **Cada regla `MUST` debe tener al menos un test `COVERED`** en la tabla "Test Coverage" de la spec. Si agregas o cambias un `MUST`, agrega o actualiza el test correspondiente en `<módulo>.test.ts` (o en `tests/` si es un test de integración) y referencia su nombre exacto en la tabla.
4. Actualiza `src/specs/_index.md` si cambia el estado de cobertura (`100%` / `parcial` / `N/A`) o el estado de la spec.
5. Antes de dar el cambio por terminado, corre:
   - `npm test` (o `pnpm test`) — debe pasar sin errores.
   - `npm run build` — debe compilar sin errores de TypeScript.

### Regla para funcionalidad nueva (spec-first)

Para un módulo o función completamente nueva, sigue el workflow documentado en `src/specs/_index.md`:

```
1. SPEC   → Crear src/specs/.../nueva-feature.spec.md (basado en _template.spec.md)
2. TYPES  → Definir interfaces TypeScript
3. TESTS  → Escribir tests que fallan (red)
4. IMPL   → Implementar hasta pasar los tests (green)
5. REFINE → Actualizar la spec si el diseño evolucionó durante la implementación
6. INDEX  → Agregar la fila correspondiente en src/specs/_index.md
```

No escribas la implementación antes que la spec y los tests para funcionalidad nueva.

### Invariantes de seguridad (`[SENTINEL]`)

Cuando un cambio introduce o modifica un control de seguridad (validación de input, límites de longitud, timeouts, manejo de cookies/headers, sanitización de URLs, etc.):

- Documenta el invariante en la spec bajo `**Invariantes de seguridad:**` con el prefijo `[SENTINEL]`, explicando qué ataque previene.
- Agrega o actualiza el comentario `// 🛡️ SENTINEL: <explicación>` en el código, justo en la línea donde se aplica el control.

**Nota:** los commits de `google-labs-jules[bot]` con título `🛡️ Sentinel: [SEVERIDAD] ...` vienen de un agente externo (Jules) que escanea vulnerabilidades automáticamente — no repliques ese formato de commit/PR salvo que se te pida explícitamente reproducirlo; para cambios normales de seguridad basta con el invariante `[SENTINEL]` en la spec y el comentario en el código.

## Pull Requests

Usa el checklist de `.github/pull_request_template.md` con honestidad: solo marca un ítem si de verdad se cumplió (spec actualizada, tests `COVERED`, `npm test` y `npm run build` pasando). Lista en el PR las specs y tests tocados.

## Comandos

- `pnpm dev` — desarrollo local
- `npm test` / `pnpm test` — correr suite Vitest
- `npm run test:coverage` — cobertura
- `npm run build` — build de producción / chequeo de tipos
- `npm run lint` — ESLint

## Qué NO hacer

- No modifiques `pdf-scraper.ts` o cualquier lógica que interactúe con `portal.skandia.com.co` sin revisar antes el spec `pdf-scraper.spec.md` — tiene invariantes `[SENTINEL]` sobre SSRF, DoS y disclosure de datos.
- No agregues `ignoreHTTPSErrors: true` ni desactives verificación TLS en Puppeteer (ver `.jules/sentinel.md`, aprendizaje del 2025-04-16).
- No inyectes contenido externo (noticias scrapeadas, texto de terceros) directamente en prompts de Gemini sin aislarlo en tags como `<noticias_externas>` (prompt injection indirecto, ver `.jules/sentinel.md`).
