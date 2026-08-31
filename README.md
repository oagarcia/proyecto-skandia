# Skandia Intelligence App

Aplicación web de inteligencia financiera y monitoreo en tiempo real para los portafolios de inversión de **Skandia Colombia**. Combina extracción automatizada de datos (web scraping & PDF parsing), visualizaciones interactivas de series históricas y análisis cuantitativo/cualitativo potenciado por modelos **Google Gemini AI**.

---

## 🚀 Características Principales

- **Monitoreo & Scraping en Tiempo Real**:
  - Extracción automatizada de rentabilidades (diaria, mensual, 6 meses, anual YTD) directamente del portal oficial de Skandia Colombia.
  - Scraping de Fichas Técnicas oficiales (PDF) por portafolio y extracción automática de las principales composiciones/activos (*holdings*).
  - Contextualización de noticias de mercado en tiempo real a través de **Yahoo Finance** y fallback dinámico a **Google News**.

- **Análisis Financiero con IA Generativa (Google Gemini)**:
  - Generación paralela con la menor latencia posible (`Promise.any`) integrando modelos Gemini (ej. `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-2.5-pro`).
  - Adjunta de forma nativa la ficha técnica oficial en PDF al prompt para análisis profundo.
  - Generación de resúmenes ejecutivos, interpretación de riesgo/retorno, estrategia del gestor, análisis de sentimiento de noticias y veredicto de inversión (Comprar / Mantener / Vender).

- **Visualización de Series Históricas & Gráficos**:
  - Gráficos interactivos de evolución con **Recharts** indexados a base 1000.
  - Selección de rangos predefinidos (1 Día, 1 Mes, 180 Días, 1 Año) y consulta personalizada por fechas.

- **Ranking & Exploración Avanzada**:
  - Clasificación multicriterio (Puntaje Combinado ponderado, YTD, 6M, 1M, 1D).
  - Filtros dinámicos por categorías (*Portafolios Abiertos, Portafolios a la Medida, Portafolios Especiales*) y perfil de riesgo (*Conservador, Moderado, Agresivo*).

- **Seguridad & Arquitectura Defense-in-Depth**:
  - **Mitigación de Prompt Injection Indirecto**: Aislamiento estricto de noticias externas en etiquetas `<noticias_externas>`, sanitización de contenido dinámico y directivas explícitas de lectura en el prompt del sistema.
  - **Rate Limiting con Cache LRU**: Control de tasa de peticiones por cliente IP con prevención contra IP spoofing mediante lectura segura del encabezado `x-forwarded-for`.
  - **Validación Estricta de Entradas**: Listas blancas de caracteres regex, límites máximos de longitud en entradas de texto y parámetros.
  - **Manejo Seguro de Llaves de API**: Envío de API Key a servicios de Google mediante cabeceras HTTP (`x-goog-api-key`), evitando filtración en URLs.
  - **Cabeceras de Seguridad HTTP**: Configuración global de CSP, HSTS, X-Frame-Options, anti-clickjacking y prevención de MIME-sniffing en rutas de API.

---

## 🛠️ Stack Tecnológico

- **Framework Principal**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack) & [React 19](https://react.dev/)
- **Lenguaje**: [TypeScript 5](https://www.typescriptlang.org/)
- **Modelos IA**: [Google Generative AI SDK](https://www.npmjs.com/package/@google/generative-ai) (Gemini 2.5 / 2.0)
- **Scraping & Automatización**: [Puppeteer](https://pptr.dev/), `@sparticuz/chromium`, `pdf-parse`, `p-limit`
- **UI & Estilos**: [Tailwind CSS v4](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [Lucide React](https://lucide.dev/)
- **Gráficos**: [Recharts](https://recharts.org/)
- **Markdown Rendering**: `react-markdown`
- **Pruebas & Calidad**: [Vitest](https://vitest.dev/), [ESLint 9](https://eslint.org/)
- **Gestor de Paquetes**: `pnpm`

---

## 📐 Arquitectura del Proyecto

```text
src/
├── app/
│   ├── api/
│   │   ├── analyze/       # Endpoint de análisis financiero con Gemini, PDFs y noticias
│   │   ├── models/        # Validación y lista de modelos Gemini disponibles
│   │   └── skandia/       # Scraping de rentabilidades y series históricas
│   ├── globals.css        # Estilos globales Tailwind CSS v4
│   ├── layout.tsx         # Layout principal con CSP e metadatos de seguridad
│   └── page.tsx           # Dashboard interactivo (Ranking, Explorador, Modales)
├── config/
│   ├── ai-settings.ts     # Configuración y lista blanca de modelos de IA
│   └── yahoo-finance-settings.ts # Mapeo de tickers/símbolos por portafolio
└── lib/
    ├── browser.ts         # Instancia compartida Puppeteer / Chromium
    ├── news-scraper.ts    # Extractor de noticias dinámicas vía Google News
    ├── pdf-parser.ts      # Extractor de activos/holdings desde buffer PDF
    ├── pdf-scraper.ts     # Obtención automatizada de fichas técnicas PDF
    ├── rate-limit.ts      # Control de tasa de peticiones e IP LRU eviction
    ├── validation.ts      # Validadores estrictos para llaves, fechas e insumos
    └── yahoo-finance.ts   # Extractor concurrente limitado (p-limit) para Yahoo Finance
```

---

## 🚦 Instrucciones de Instalación y Uso

### Requisitos Previos

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) (recomendado)

### 1. Instalación de Dependencias

```bash
pnpm install
```

*Nota: La instalación incluirá automáticamente la descarga de la versión de Chromium compatible para Puppeteer vía `postinstall`.*

### 2. Ejecutar en Modo Desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### 3. Configuración de API Key para Análisis IA

Para utilizar las funciones de **Análisis AI**, ingresa tu **Google Gemini API Key** directamente en la interfaz cuando se requiera en el modal de análisis. La clave se almacena de forma segura en `localStorage` de tu navegador.

---

## 🧪 Pruebas y Linting

El proyecto cuenta con una suite de pruebas unitarias automatizadas con **Vitest**:

```bash
# Ejecutar todas las pruebas unitarias
pnpm test

# Ejecutar pruebas en modo de observación (watch)
pnpm test:watch

# Ejecutar análisis de código (linter)
pnpm run lint
```

---

## 📦 Construcción para Producción

Para validar el proyecto y generar el build optimizado de Next.js:

```bash
pnpm build
pnpm start
```

---

## 🛡️ Notas de Mantenimiento y Seguridad

- **Monitoreo del Portal Skandia**: La estructura del portal de Skandia (`portal.skandia.com.co`) se escanea a través de los adaptadores en `src/app/api/skandia/route.ts` y `src/lib/pdf-scraper.ts`. En caso de cambios en la interfaz o selectores de la plataforma externa, actualiza dichos selectores.
- **Límites de Concurrencia & Tiempos de Espera**: Para evitar saturación de memoria o bloqueos IP por scrapers, las llamadas de scraping utilizan un límite de concurrencia controlled (`p-limit`) e incluyen un `AbortSignal.timeout` o tiempo de espera explícito (`timeout: 30000`).
