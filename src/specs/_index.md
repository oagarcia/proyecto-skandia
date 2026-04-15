# SDD Coverage Index

Estado de cobertura de Specification-Driven Development en el proyecto Skandia Intelligence.

> **Convención:** Cada regla `MUST` en una spec debe tener al menos un test `COVERED`. Las reglas `SHOULD` son deseables pero no bloqueantes.

---

## Módulos de librería (`src/lib/`)

| Módulo | Spec | Estado spec | Tests | Cobertura MUST |
|--------|------|-------------|-------|----------------|
| `validation.ts` | [validation.spec.md](lib/validation.spec.md) | ACTIVE | `validation.test.ts` | 100% |
| `rate-limit.ts` | [rate-limit.spec.md](lib/rate-limit.spec.md) | ACTIVE | `rate-limit.test.ts` | 100% |
| `intelligence.ts` | [intelligence.spec.md](lib/intelligence.spec.md) | ACTIVE | `intelligence.test.ts` | 100% |
| `pdf-parser.ts` | [pdf-parser.spec.md](lib/pdf-parser.spec.md) | ACTIVE | `pdf-parser.test.ts` | 100% |
| `browser.ts` | [browser.spec.md](lib/browser.spec.md) | ACTIVE | *(integración, sin unit tests)* | N/A |
| `news-scraper.ts` | [news-scraper.spec.md](lib/news-scraper.spec.md) | ACTIVE | `news-scraper.test.ts` | parcial |
| `pdf-scraper.ts` | [pdf-scraper.spec.md](lib/pdf-scraper.spec.md) | ACTIVE | `pdf-scraper.test.ts` | parcial |
| `yahoo-finance.ts` | [yahoo-finance.spec.md](lib/yahoo-finance.spec.md) | ACTIVE | `tests/test-ssrf.test.ts` | parcial |

## API Routes (`src/app/api/`)

| Ruta | Spec | Estado spec | Tests unitarios |
|------|------|-------------|-----------------|
| `api/analyze/route.ts` | [analyze-route.spec.md](api/analyze-route.spec.md) | ACTIVE | *(requiere Next.js runtime)* |
| `api/skandia/route.ts` | [skandia-route.spec.md](api/skandia-route.spec.md) | ACTIVE | *(requiere Next.js runtime)* |
| `api/models/route.ts` | [models-route.spec.md](api/models-route.spec.md) | ACTIVE | *(requiere Next.js runtime)* |

## Configuración (`src/config/`)

| Módulo | Spec | Estado spec | Tests |
|--------|------|-------------|-------|
| `ai-settings.ts` | [ai-settings.spec.md](config/ai-settings.spec.md) | ACTIVE | `ai-settings.test.ts` |
| `yahoo-finance-settings.ts` | [yahoo-finance-settings.spec.md](config/yahoo-finance-settings.spec.md) | ACTIVE | *(sin unit tests)* |

---

## Workflow para nuevas features

```
1. SPEC   → Crear src/specs/lib/nueva-feature.spec.md
2. TYPES  → Definir interfaces TypeScript en el módulo
3. TESTS  → Escribir tests que fallan (red) — referenciar spec con @spec
4. IMPL   → Implementar hasta pasar los tests (green)
5. REFINE → Actualizar spec si el diseño evolucionó
6. PR     → Incluir spec + tests + impl juntos con checklist SDD
```

## Leyenda de estados

- **DRAFT** — en construcción, puede cambiar sin aviso
- **ACTIVE** — contrato estable, cambios requieren actualizar tests
- **DEPRECATED** — módulo en proceso de eliminación, no usar en nuevas features
