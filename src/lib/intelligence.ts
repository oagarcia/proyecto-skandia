export interface AnalysisResult {
    summary: string;
    risks: string[];
    advantages: string[];
    recommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell';
    score: number; // 0-100
}

export function analyzePortfolio(portfolio: any): AnalysisResult {
    const { name, type, returns, risk } = portfolio;
    const yearly = parseFloat(returns.yearly.replace('%', '').replace(',', '.'));
    const monthly = parseFloat(returns.monthly.replace('%', '').replace(',', '.'));

    let summary = '';
    const risks: string[] = [];
    const advantages: string[] = [];
    let score = 50;

    // Base Score on Returns
    if (yearly > 15) score += 30;
    else if (yearly > 10) score += 20;
    else if (yearly > 5) score += 10;
    else if (yearly < 0) score -= 20;

    // Momentum (Monthly vs Yearly)
    if (monthly > 0 && yearly > 0) {
        score += 5;
        summary += 'Muestra una tendencia positiva consistente tanto a corto como a largo plazo. ';
    } else if (monthly < 0 && yearly > 0) {
        summary += 'A pesar de una corrección reciente en el último mes, mantiene una tendencia anual sólida. Podría ser una oportunidad de entrada. ';
    } else if (monthly > 0 && yearly < 0) {
        summary += 'Muestra signos de recuperación reciente, aunque el desempeño anual sigue siendo negativo. ';
    }

    // Type Analysis
    if (type === 'RV' || name.includes('Acciones')) {
        summary += 'Como fondo de Renta Variable, está expuesto a la volatilidad del mercado pero ofrece mayor potencial de crecimiento. ';
        risks.push('Alta volatilidad de mercado');
        risks.push('Sensibilidad a ciclos económicos globales');
        advantages.push('Potencial de rentabilidad superior a la inflación');
        advantages.push('Ideal para horizontes de inversión > 5 años');

        if (name.includes('Global') || name.includes('S&P')) {
            advantages.push('Diversificación geográfica (Dólar/Euros)');
            risks.push('Riesgo cambiario (TRM)');
        }
        if (name.includes('Colombia')) {
            risks.push('Riesgo país y político local');
            advantages.push('Exposición a empresas líderes nacionales');
        }
        if (name.includes('Tecnología')) {
            summary += 'El sector tecnológico suele tener un beta alto, lo que amplifica las ganancias en mercados alcistas.';
            risks.push('Concentración sectorial');
            advantages.push('Exposición a innovación y crecimiento exponencial');
        }
    } else if (type === 'RF' || name.includes('Renta Fija') || name.includes('Bonos')) {
        summary += 'Este portafolio de Renta Fija busca preservar capital con rendimientos estables. ';
        risks.push('Riesgo de tasa de interés (si suben las tasas, el precio de los bonos baja)');
        risks.push('Riesgo de reinversión');
        advantages.push('Flujo de caja predecible');
        advantages.push('Menor volatilidad que las acciones');
        if (yearly < 5) {
            summary += 'Actualmente ofrece rendimientos por debajo de la inflación histórica reciente, lo que implica pérdida de poder adquisitivo real. ';
        }
    } else if (type === 'IA' || name.includes('Alternativo') || name.includes('Inmobiliario')) {
        summary += 'Inversión Alternativa enfocada en descorrelación con los mercados tradicionales. ';
        risks.push('Menor liquidez');
        risks.push('Valoración periódica (no diaria)');
        advantages.push('Diversificación real del portafolio');
        advantages.push('Protección contra inflación (en caso de inmobiliarios)');
    }

    // Risk Profile Adjustment
    if (risk === 'Conservador') {
        summary += 'Adecuado para perfiles que priorizan la seguridad sobre el rendimiento.';
        if (score > 80) score = 80; // Cap score for conservative to avoid over-hyping
    } else if (risk === 'Agresivo') {
        summary += 'Diseñado para inversionistas con alta tolerancia al riesgo.';
    }

    // Recommendation
    let recommendation: AnalysisResult['recommendation'] = 'Hold';
    if (score >= 80) recommendation = 'Strong Buy';
    else if (score >= 60) recommendation = 'Buy';
    else if (score <= 30) recommendation = 'Sell';

    return {
        summary,
        risks,
        advantages,
        recommendation,
        score
    };
}
