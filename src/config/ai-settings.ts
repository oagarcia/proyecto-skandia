export const aiSettings = {
    // Set to true to restrict which models can be selected in the dropdown
    restrictModels: true,

    // List of models that are allowed to be selected when restrictModels is true
    // Examples: 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'
    allowedModels: [
        'gemini-pro-latest',
        'gemini-flash-lite-latest',
        'gemini-flash-latest',
        'gemini-2.5-pro',
        'gemini-2.5-flash-lite'
    ],

    // The model to select by default. 
    // Must be in the allowedModels list if restrictModels is true.
    defaultModel: 'gemini-2.5-flash-lite'
};
