# Spec: ai-settings

**Archivo:** `src/config/ai-settings.ts`
**Creada:** 2026-04-14
**Última revisión:** 2026-04-14
**Estado:** ACTIVE

## Propósito

Configura qué modelos de Google Gemini están disponibles en la aplicación y cuál es el modelo por defecto. Centraliza la lista de modelos permitidos para que `validateModel` pueda validar las selecciones del usuario.

---

## Estructura de configuración

```typescript
const aiSettings = {
    restrictModels: boolean,
    allowedModels: string[],
    defaultModel: string,
}
```

## Invariantes

- MUST: Si `restrictModels === true`, entonces `defaultModel` DEBE estar en `allowedModels`. De lo contrario, la UI no podría seleccionar el modelo por defecto.
- SHOULD: `allowedModels` debe contener al menos un modelo para que la aplicación funcione.
- SHOULD: Todos los modelos en `allowedModels` deben ser IDs válidos de Google Gemini (no se valida automáticamente en runtime).

---

## Test Coverage

| Regla | Archivo de test | Nombre del test | Estado |
|-------|-----------------|-----------------|--------|
| MUST defaultModel en allowedModels cuando restrictModels:true | `src/config/ai-settings.test.ts` | `"defaultModel must be in allowedModels when restrictModels is true"` | COVERED |
| SHOULD allowedModels no vacío | `src/config/ai-settings.test.ts` | `"allowedModels must not be empty"` | COVERED |
