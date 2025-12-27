# Skandia Intelligence App

Esta aplicación permite monitorear en tiempo real los portafolios de inversión de Skandia, analizar sus rentabilidades y recibir recomendaciones basadas en el desempeño histórico.

## Características

- **Monitoreo en Tiempo Real**: Extrae datos actualizados directamente del portal de Skandia.
- **Análisis de Rentabilidad**: Visualiza el rendimiento diario, mensual, semestral y anual.
- **Recomendaciones Inteligentes**: Sugiere los mejores portafolios basándose en el retorno anual (YTD).
- **Filtrado Avanzado**: Filtra por Tipo de Inversión (Renta Variable, Renta Fija, etc.) y Perfil de Riesgo.
- **Interfaz Premium**: Diseño moderno y responsivo.

## Tecnologías

- ** RAG y LLMs de Gemini **
- **Next.js 15**: Framework de React.
- **Puppeteer**: Para la extracción de datos (Scraping).
- **Tailwind CSS v4**: Estilos modernos.
- **Framer Motion**: Animaciones fluidas.
- **LangChain**: Pendiente de implementar para incluir deciiones con Agentes para decidir fuentes externas de información

## Instrucciones de Uso

1.  Instalar dependencias:
    ```bash
    npm install
    ```

2.  Iniciar el servidor de desarrollo:
    ```bash
    npm run dev
    ```

3.  Abrir `http://localhost:3000` (o el puerto que indique la consola).

## Notas

- La primera carga puede tardar unos segundos mientras el sistema conecta con el portal de Skandia.
- Si el portal de Skandia cambia su estructura, es posible que sea necesario actualizar el scraper en `src/app/api/skandia/route.ts`.
