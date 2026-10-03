// Shared by the client (page.tsx) and the API routes: keep it free of Node-only imports.

export const PORTFOLIO_PDF_ENDPOINT = '/api/portfolio-pdf';

export function buildPortfolioPdfEndpointUrl(portfolioName: string): string {
    return `${PORTFOLIO_PDF_ENDPOINT}?${new URLSearchParams({ name: portfolioName })}`;
}

export function buildPdfDataUrl(pdfBase64: string): string {
    return `data:application/pdf;base64,${pdfBase64}`;
}

export function getPdfFileName(portfolioName: string): string {
    // 🛡️ SENTINEL: Only [a-zA-Z0-9_] survive, so the name is safe inside a Content-Disposition header.
    return `Ficha_Tecnica_${portfolioName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
}
