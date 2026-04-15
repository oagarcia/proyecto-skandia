# Spec: [Nombre del Módulo]

**Archivo:** `src/lib/nombre.ts`
**Creada:** YYYY-MM-DD
**Última revisión:** YYYY-MM-DD
**Estado:** DRAFT | ACTIVE | DEPRECATED

## Propósito

Una oración describiendo para qué existe este módulo y qué problema resuelve.

## Dependencias

- `@/config/algo` — para qué se usa
- `./otro-modulo` — para qué se usa

## API Pública

### `nombreFuncion(param: Tipo): ReturnType`

**Descripción:** Qué hace en una oración.

**Precondiciones:**
- MUST: Condiciones que deben cumplirse antes de llamar a la función

**Postcondiciones:**
- MUST: Qué garantiza el resultado cuando la función retorna
- SHOULD: Qué hace normalmente pero puede variar según contexto
- MAY: Comportamiento opcional

**Casos de error:**
- Condición que falla → comportamiento esperado (retorna X, lanza Y)

**Invariantes de seguridad:**
- `[SENTINEL]` Descripción del invariante de seguridad documentado en el código

---

## Comportamientos del módulo

Comportamientos que aplican a todas las funciones o al módulo como un todo (ej: estado global, efectos secundarios, restricciones generales).

---

## Test Coverage

| Regla | Archivo de test | Nombre del test | Estado |
|-------|-----------------|-----------------|--------|
| MUST descripción de la regla | `src/lib/nombre.test.ts` | `"nombre del test"` | COVERED |
| MUST otra regla | — | — | MISSING |

---

## Gaps y decisiones pendientes

<!-- GAP: Comportamiento no especificado que requiere una decisión de diseño -->

---

## Historial de cambios

| Fecha | Cambio |
|-------|--------|
| YYYY-MM-DD | Spec inicial creada |
