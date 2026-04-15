# Spec: validation

**Archivo:** `src/lib/validation.ts`
**Creada:** 2026-04-14
**Última revisión:** 2026-04-14
**Estado:** ACTIVE

## Propósito

Validar y sanitizar todos los inputs que llegan desde el exterior (requests HTTP, parámetros de API) antes de que sean procesados por la lógica de negocio o enviados a servicios externos (Gemini AI). Previene prompt injection, DoS por payloads masivos, y datos malformados.

## Dependencias

- `@/config/ai-settings` — para validar el modelo contra la lista de modelos permitidos

## Constantes exportadas

| Constante | Valor | Propósito |
|-----------|-------|-----------|
| `MAX_NAME_LENGTH` | 100 | Longitud máxima del nombre del portafolio |
| `MAX_TYPE_LENGTH` | 50 | Longitud máxima del tipo de portafolio |
| `MAX_RISK_LENGTH` | 50 | Longitud máxima del perfil de riesgo |
| `MAX_VALUE_LENGTH` | 50 | Longitud máxima del campo value (cuando es string) |
| `MAX_RETURN_LENGTH` | 20 | Longitud máxima de cada campo de retorno |

## Tipos exportados

### `Portfolio`

```typescript
interface Portfolio {
  name: string;
  type: string;
  risk: string;
  value: string | number;
  returns: {
    daily: string;
    monthly: string;
    sixMonths: string;
    yearly: string;
  };
}
```

---

## API Pública

### `validatePortfolio(data: unknown): { valid: boolean; error?: string }`

**Descripción:** Valida que un objeto desconocido cumple el contrato del tipo `Portfolio` y no contiene caracteres peligrosos.

**Precondiciones:**
- Acepta cualquier valor (unknown)

**Postcondiciones:**
- MUST retornar `{ valid: false }` si `data` es null, undefined, o no es un objeto
- MUST retornar `{ valid: false }` si falta alguno de los campos requeridos: `name`, `type`, `risk`, `value`, `returns`
- MUST retornar `{ valid: false }` si `name` es string vacío o solo espacios
- MUST retornar `{ valid: false }` si `name.length > MAX_NAME_LENGTH`
- MUST retornar `{ valid: false }` si `name` contiene caracteres fuera de `SAFE_TEXT_REGEX` (ej: newlines, caracteres de control)
- MUST retornar `{ valid: false }` si `type.length > MAX_TYPE_LENGTH` o contiene caracteres inválidos
- MUST retornar `{ valid: false }` si `risk.length > MAX_RISK_LENGTH` o contiene caracteres inválidos
- MUST retornar `{ valid: false }` si `value` no es string ni number
- MUST retornar `{ valid: false }` si `value` es string y excede `MAX_VALUE_LENGTH` o contiene caracteres inválidos
- MUST retornar `{ valid: false }` si falta algún campo de `returns`: `daily`, `monthly`, `sixMonths`, `yearly`
- MUST retornar `{ valid: false }` si cualquier campo de `returns` no es string, excede `MAX_RETURN_LENGTH`, o contiene caracteres inválidos
- MUST retornar `{ valid: true }` cuando todos los campos son válidos

**Invariantes de seguridad:**
- `[SENTINEL]` `SAFE_TEXT_REGEX` rechaza newlines (`\n`) y caracteres de control para prevenir prompt injection en el contexto enviado a Gemini AI. Solo permite: alfanuméricos, espacios, puntuación común (`.`, `,`, `-`, `(`, `)`, `'`, `&`, `%`, `+`) y caracteres españoles (`áéíóúÁÉÍÓÚñÑüÜ`).

---

### `validateApiKey(key: unknown): { valid: boolean; error?: string }`

**Descripción:** Valida que un valor es una API Key de Google AI con formato seguro.

**Postcondiciones:**
- MUST retornar `{ valid: false }` si `key` no es un string
- MUST retornar `{ valid: false }` si `key.length < 20` (demasiado corta para ser una key real)
- MUST retornar `{ valid: false }` si `key.length > 100` (previene payloads masivos)
- MUST retornar `{ valid: false }` si `key` contiene caracteres que no sean alfanuméricos, guiones (`-`) o underscores (`_`)
- MUST retornar `{ valid: true }` para keys con 20-100 chars de caracteres válidos

**Invariantes de seguridad:**
- `[SENTINEL]` El regex `^[a-zA-Z0-9_\-]+$` previene ataques de injection via el campo de API Key.

---

### `validateModel(model: unknown): { valid: boolean; error?: string }`

**Descripción:** Valida que un modelo Gemini seleccionado esté en la lista de modelos permitidos. El modelo es un campo opcional.

**Postcondiciones:**
- MUST retornar `{ valid: true }` si `model` es falsy (`undefined`, `null`, `""`, `0`)
- MUST retornar `{ valid: false }` si `model` no es string (pero es truthy)
- MUST retornar `{ valid: false }` si `model` no está en `aiSettings.allowedModels`
- MUST retornar `{ valid: true }` si `model` está en `aiSettings.allowedModels`

<!-- GAP: `validateModel("")` retorna `{ valid: true }` porque `!""` es truthy. String vacío podría considerarse inválido. Comportamiento actual documentado, decisión de mantenerlo queda pendiente. -->

---

### `isValidDate(dateString: string): boolean`

**Descripción:** Valida que un string tiene formato de fecha `YYYY-MM-DD` válido, sin overflow.

**Postcondiciones:**
- MUST retornar `false` si el string no tiene el formato exacto `YYYY-MM-DD`
- MUST retornar `false` si la fecha tiene overflow (ej: `2023-02-30` → se convierte en `2023-03-02`)
- MUST retornar `false` si la fecha no es parseable por `Date`
- MUST usar métodos UTC (`getUTCFullYear`, `getUTCMonth`, `getUTCDate`) para la comparación, ya que `YYYY-MM-DD` se parsea como UTC midnight
- MUST retornar `true` para fechas válidas como `2023-01-15`, `2024-02-29` (año bisiesto)

---

## Test Coverage

| Regla | Archivo de test | Nombre del test | Estado |
|-------|-----------------|-----------------|--------|
| MUST rechazar non-object | `src/lib/validation.test.ts` | `"should reject null, undefined, and non-objects"` | COVERED |
| MUST rechazar campo faltante | `src/lib/validation.test.ts` | `"should reject missing required fields"` | COVERED |
| MUST rechazar name con newline | `src/lib/validation.test.ts` | `"should reject strings with newline injection"` | COVERED |
| MUST rechazar name con caracteres de control | `src/lib/validation.test.ts` | `"should reject strings with control characters"` | COVERED |
| MUST rechazar name > MAX_NAME_LENGTH | `src/lib/validation.test.ts` | `"should reject name exceeding MAX_NAME_LENGTH"` | COVERED |
| MUST retornar valid:true para portfolio válido | `src/lib/validation.test.ts` | `"should accept a valid portfolio"` | COVERED |
| MUST rechazar key < 20 chars | `src/lib/validation.test.ts` | `"should reject keys shorter than 20 chars"` | COVERED |
| MUST rechazar key > 100 chars | `src/lib/validation.test.ts` | `"should reject keys longer than 100 chars"` | COVERED |
| MUST rechazar key con caracteres especiales | `src/lib/validation.test.ts` | `"should reject keys with special characters"` | COVERED |
| MUST aceptar key válida | `src/lib/validation.test.ts` | `"should accept a valid API key"` | COVERED |
| MUST retornar valid:true para model undefined/null | `src/lib/validation.test.ts` | `"should return valid when model is absent"` | COVERED |
| MUST rechazar model fuera de allowedModels | `src/lib/validation.test.ts` | `"should reject models not in allowedModels"` | COVERED |
| MUST rechazar fecha con overflow | `src/lib/validation.test.ts` | `"should reject date overflow like 2023-02-30"` | COVERED |
| MUST rechazar formato inválido | `src/lib/validation.test.ts` | `"should reject invalid date formats"` | COVERED |
| MUST usar UTC para comparación | `src/lib/validation.test.ts` | `"should use UTC for date comparison"` | COVERED |
| MUST aceptar fechas válidas | `src/lib/validation.test.ts` | `"should accept valid dates"` | COVERED |

---

## Gaps y decisiones pendientes

<!-- GAP: `value: number` no valida rango. ¿Puede ser negativo o Infinity? Actualmente se acepta cualquier número. -->
<!-- GAP: `validateModel("")` retorna valid:true. String vacío es tratado como "no provisto". -->
