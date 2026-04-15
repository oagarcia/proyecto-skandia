# Spec: intelligence

**Archivo:** `src/lib/intelligence.ts`
**Creada:** 2026-04-14
**Última revisión:** 2026-04-14
**Estado:** ACTIVE

## Propósito

Analiza un portafolio de inversión y genera un resultado estructurado con resumen narrativo, riesgos, ventajas, recomendación y score numérico. Es la lógica de negocio central del análisis pre-Gemini: proporciona el contexto preliminar que se incluye en el prompt de IA.

## Tipos exportados

### `AnalysisResult`

```typescript
interface AnalysisResult {
    summary: string;
    risks: string[];
    advantages: string[];
    recommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell';
    score: number; // 0-100
}
```

---

## API Pública

### `analyzePortfolio(portfolio: any): AnalysisResult`

**Descripción:** Genera un análisis estructurado de un portafolio basado en sus retornos, tipo y perfil de riesgo.

<!-- GAP: El parámetro es `any` en código TypeScript strict. Debería tipificarse con la interface `Portfolio` de `validation.ts`. Campos usados internamente: `name: string`, `type: string`, `risk: string`, `returns.yearly: string`, `returns.monthly: string`. -->

**Campos que consume del portfolio:**
- `name` — nombre del portafolio (ej: "FPV Acciones Colombia")
- `type` — tipo: `'RV'`, `'RF'`, `'IA'` u otros
- `risk` — perfil: `'Conservador'`, `'Moderado'`, `'Agresivo'`
- `returns.yearly` — retorno anual como string con `%` (ej: `"12.30%"`)
- `returns.monthly` — retorno mensual como string con `%` (ej: `"1.20%"`)

**Algoritmo de scoring (score inicial: 50):**

| Condición | Ajuste |
|-----------|--------|
| `yearly > 15%` | +30 |
| `yearly > 10%` | +20 |
| `yearly > 5%` | +10 |
| `yearly < 0%` | -20 |
| `monthly > 0 && yearly > 0` (momentum positivo) | +5 |

**Postcondiciones:**

- MUST retornar un objeto `AnalysisResult` con todos los campos
- MUST iniciar el score en 50 antes de aplicar ajustes
- MUST aplicar los ajustes de retorno anual según la tabla de scoring
- MUST agregar +5 al score cuando `monthly > 0 && yearly > 0` (momentum positivo consistente)
- MUST hacer cap del score a 80 para portafolios con `risk === 'Conservador'`
- MUST retornar `'Strong Buy'` cuando `score >= 80`
- MUST retornar `'Buy'` cuando `score >= 60 && score < 80`
- MUST retornar `'Hold'` cuando `score > 30 && score < 60`
- MUST retornar `'Sell'` cuando `score <= 30`
- MUST incluir riesgo cambiario (TRM) en `risks` cuando el nombre incluye 'Global' o 'S&P'
- MUST incluir riesgo país en `risks` cuando el nombre incluye 'Colombia'
- MUST retornar el campo `summary` como string (puede ser vacío)
- MUST retornar arrays `risks` y `advantages` (pueden estar vacíos)

**Parsing de retornos:**
- Los valores de `returns.yearly` y `returns.monthly` se parsean removiendo `%` y reemplazando `,` por `.` antes de convertir a float. Ej: `"12,30%"` → `12.30`

---

## Test Coverage

| Regla | Archivo de test | Nombre del test | Estado |
|-------|-----------------|-----------------|--------|
| MUST score base 50 + ajuste yearly > 15% | `src/lib/intelligence.test.ts` | `"should add 30 points for yearly returns > 15%"` | COVERED |
| MUST score base 50 + ajuste yearly > 10% | `src/lib/intelligence.test.ts` | `"should add 20 points for yearly returns > 10%"` | COVERED |
| MUST score base 50 + ajuste yearly > 5% | `src/lib/intelligence.test.ts` | `"should add 10 points for yearly returns > 5%"` | COVERED |
| MUST score base 50 + ajuste yearly < 0% | `src/lib/intelligence.test.ts` | `"should subtract 20 points for negative yearly returns"` | COVERED |
| MUST +5 por momentum positivo | `src/lib/intelligence.test.ts` | `"should add 5 points for positive momentum"` | COVERED |
| MUST cap score 80 para Conservador | `src/lib/intelligence.test.ts` | `"should cap score at 80 for Conservador risk profile"` | COVERED |
| MUST recommendation Strong Buy para score >= 80 | `src/lib/intelligence.test.ts` | `"should recommend Strong Buy for score >= 80"` | COVERED |
| MUST recommendation Buy para 60 <= score < 80 | `src/lib/intelligence.test.ts` | `"should recommend Buy for score between 60 and 79"` | COVERED |
| MUST recommendation Sell para score <= 30 | `src/lib/intelligence.test.ts` | `"should recommend Sell for score <= 30"` | COVERED |
| MUST riesgo cambiario para portafolios con Global/S&P | `src/lib/intelligence.test.ts` | `"should include currency risk for global portfolios"` | COVERED |
| MUST riesgo país para portafolios con Colombia | `src/lib/intelligence.test.ts` | `"should include country risk for Colombian portfolios"` | COVERED |
| MUST retornar AnalysisResult completo | `src/lib/intelligence.test.ts` | `"should return a complete AnalysisResult object"` | COVERED |

---

## Gaps y decisiones pendientes

<!-- GAP: `portfolio: any` viola TypeScript strict. Propuesta: usar la interface `Portfolio` de `src/lib/validation.ts` como tipo de entrada. Esto requeriría que `returns.yearly` y `returns.monthly` sean strings (ya es el caso en Portfolio). -->
<!-- GAP: No hay manejo de error si `returns.yearly` no es un string parseable como número. `parseFloat('texto')` retorna `NaN`, lo que puede producir comportamientos inesperados en los condicionales de score. -->
