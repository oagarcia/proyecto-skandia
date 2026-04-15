# Spec: yahoo-finance-settings

**Archivo:** `src/config/yahoo-finance-settings.ts`
**Creada:** 2026-04-14
**Última revisión:** 2026-04-14
**Estado:** ACTIVE

## Propósito

Mapeo de nombres de portafolios a símbolos de mercado de Yahoo Finance. Cuando un portafolio está en este mapa, el sistema obtiene noticias de Yahoo Finance (datos más precisos) en lugar de Google News (búsqueda genérica).

---

## Estructura

```typescript
const yahooFinanceResearchConfig = {
    portfolios: {
        [portfolioName: string]: string[] // Lista de tickers de Yahoo Finance
    },
    settings: {
        maxNewsToAnalyze: number // Máximo de noticias por símbolo
    }
}
```

## Configuración actual

| Portafolio | Símbolos | Descripción |
|------------|----------|-------------|
| "FPV Acciones Nuevas Tecnología" | `%5EIXIC`, `BST`, `IXN` | NASDAQ, BlackRock Tech Trust, iShares Global Tech |
| "FPV Acciones Grupo Cibest" | `CIB` | Bancolombia |

## Invariantes

- `maxNewsToAnalyze` SHOULD ser un entero positivo.
- Los tickers deben ser válidos en Yahoo Finance (no se valida en runtime — es responsabilidad del mantenedor del config).

---

## Test Coverage

| Regla | Estado |
|-------|--------|
| Estructura básica del config | *(sin tests — es configuración, no lógica)* |

> **Nota:** Este archivo es configuración pura (datos), no lógica. No requiere tests unitarios. Los cambios se verifican por revisión manual de PR.
