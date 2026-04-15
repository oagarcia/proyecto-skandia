# Spec: browser

**Archivo:** `src/lib/browser.ts`
**Creada:** 2026-04-14
**Última revisión:** 2026-04-14
**Estado:** ACTIVE

## Propósito

Factory que devuelve una instancia configurada de Puppeteer Browser compatible con entorno de desarrollo local (macOS) y entornos serverless de producción (Vercel). Abstrae la diferencia de configuración entre ambos entornos.

## Dependencias

- `puppeteer-core` — lanzador del browser
- `@sparticuz/chromium` — binario de Chromium optimizado para serverless

---

## API Pública

### `getBrowser(): Promise<Browser>`

**Descripción:** Lanza y retorna una instancia de Puppeteer Browser configurada según el entorno de ejecución.

**Postcondiciones:**
- MUST retornar una instancia `Browser` de puppeteer-core
- MUST detectar el entorno vía `process.env.NODE_ENV === 'development'`

**En entorno de desarrollo (`NODE_ENV === 'development'`):**
- MUST usar `executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`
- MUST incluir flags de seguridad: `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`, `--disable-gpu`
- MUST lanzar en modo `headless: true`

**En producción (`NODE_ENV !== 'development'`):**
- MUST usar `chromium.args` de `@sparticuz/chromium` como args del browser
- MUST obtener el `executablePath` desde `chromium.executablePath(url)` con una URL hardcodeada
- La URL de Chromium es una constante en el código — no se recibe como input del usuario
- MUST usar `headless: true` e `ignoreHTTPSErrors: true`

**Invariantes de seguridad:**
- `[SENTINEL]` La URL del binario de Chromium en producción es una constante hardcodeada (`https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar`). No se acepta como input del usuario para prevenir SSRF.

**Manejo de errores:**
- Si el browser no puede lanzarse (Chrome no instalado, binario inaccesible), puppeteer lanza una excepción. Esta excepción NO es capturada — el caller (routes API) es responsable de manejarla.

---

## Test Coverage

| Regla | Archivo de test | Nombre del test | Estado |
|-------|-----------------|-----------------|--------|
| MUST usar Chrome local en development | *(integración — requiere Chrome instalado)* | — | N/A |
| MUST usar @sparticuz/chromium en producción | *(integración — requiere entorno serverless)* | — | N/A |

> **Nota:** Este módulo no tiene tests unitarios porque su única función lanza un proceso de browser (efecto externo puro). Los contratos de configuración se verifican por inspección de código y deployment a Vercel.

---

## Gaps y decisiones pendientes

<!-- GAP: `options: any` en el tipo interno. El tipo correcto sería PuppeteerLaunchOptions de puppeteer-core. -->
<!-- GAP: No hay timeout explícito en el launch del browser. Si Chrome no responde, la promise puede colgar indefinidamente. -->
