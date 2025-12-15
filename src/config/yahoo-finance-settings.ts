export const yahooFinanceResearchConfig = {
    // Map of Portfolio Name -> Array of Yahoo Finance Symbols
    // When a portfolio matches a key here, the system will fetch data from Yahoo Finance 
    // instead of performing a generic Google Search.
    portfolios: {
        "FPV Acciones Nuevas Tecnología": [
            "%5EIXIC", // NASDAQ Composite
            "BST",     // BlackRock Science and Technology Trust
            "IXN"      // iShares Global Tech ETF
        ],
        "FPV Acciones Grupo Cibest": [
            "CIB"      // Bancolombia
        ]
    },
    settings: {
        maxNewsToAnalyze: 5 // Default number of news items to fetch and analyze per symbol
    }
};
