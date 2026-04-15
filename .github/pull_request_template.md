# Descripción

<!-- Explica qué hace este PR y por qué es necesario. -->

## Tipo de cambio

- [ ] Nueva feature
- [ ] Bug fix
- [ ] Refactoring
- [ ] Seguridad (SENTINEL)
- [ ] Documentación / Spec
- [ ] Config

---

## Checklist SDD

Para **nueva funcionalidad o cambios a módulos existentes:**

- [ ] La spec existe o fue actualizada en `src/specs/`
- [ ] Cada regla `MUST` en la spec tiene al menos un test `COVERED`
- [ ] El `src/specs/_index.md` está actualizado con el estado de cobertura
- [ ] `npm test` pasa sin errores
- [ ] `npm run build` pasa sin errores TypeScript

Para **cambios de seguridad:**

- [ ] El invariante de seguridad está documentado como `[SENTINEL]` en la spec correspondiente
- [ ] El comentario `// 🛡️ SENTINEL:` fue agregado o actualizado en el código

Para **nueva feature (spec-first):**

- [ ] La spec fue creada **antes** de la implementación
- [ ] Los tests fueron escritos **antes** de la implementación (red → green)
- [ ] El PR incluye spec + tests + implementación juntos

---

## Archivos de spec relacionados

<!-- Lista las specs creadas o modificadas -->
- `src/specs/lib/...`
- `src/specs/api/...`

## Archivos de test relacionados

<!-- Lista los archivos de test agregados o modificados -->
- `src/lib/....test.ts`

---

## Cómo probar

<!-- Describe los pasos para verificar este PR manualmente -->

1. `npm test` — todos los tests deben pasar
2. `npm run dev` — verificar que la UI funciona como se espera
