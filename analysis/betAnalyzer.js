class BetAnalyzer {
    constructor() {
        this.supportedSports = ['футбол', 'хоккей', 'баскетбол', 'теннис'];
    }

    parseCoefficients(text) {
        const patterns = [
            /(\d+[.,]\d+)/g,           // десятичные коэффициенты
            /(\d+\/\d+)/g,             // дробные коэффициенты
            /(\d+\.\d{2})/g,           // коэффициенты с двумя decimal
        ];

        const coefficients = [];

        patterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    try {
                        let coeff;

                        if (match.includes('/')) {
                            // Дробный коэффициент
                            const [numerator, denominator] = match.split('/').map(Number);
                            coeff = parseFloat((numerator / denominator).toFixed(2));
                        } else {
                            // Десятичный коэффициент
                            coeff = parseFloat(match.replace(',', '.'));
                        }

                        // Фильтруем разумные значения
                        if (coeff > 1.0 && coeff < 100.0) {
                            coefficients.push(coeff);
                        }
                    } catch (error) {
                        console.log('Error parsing coefficient:', match);
                    }
                });
            }
        });

        return coefficients;
    }

    extractTeams(text) {
        const teamPatterns = [
            /([а-яa-z]+\s+[а-яa-z]+)\s+(?:vs|против|against)\s+([а-яa-z]+\s+[а-яa-z]+)/i,
            /([а-яa-z]+\s+[а-яa-z]+)\s*[-—]\s*([а-яa-z]+\s+[а-яa-z]+)/i,
            /([а-яa-z]+)\s+(?:и|and)\s+([а-яa-z]+)/i,
        ];

        for (const pattern of teamPatterns) {
            const match = text.match(pattern);
            if (match) {
                return [match[1].trim(), match[2].trim()];
            }
        }

        // Если команды не найдены, используем заглушки
        return ['Команда A', 'Команда B'];
    }

    detectBookmaker(text) {
        const bookmakers = {
            '1xbet': ['1xbet', '1xstavka', '1хбет'],
            'fonbet': ['fonbet', 'фонбет'],
            'marathon': ['marathon', 'марафон'],
            'bet365': ['bet365', 'бет365'],
            'leon': ['leon', 'леон'],
            'winline': ['winline', 'винлайн']
        };

        for (const [bookmaker, keywords] of Object.entries(bookmakers)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return bookmaker;
            }
        }

        return 'unknown';
    }

    analyzeBet(text) {
        const coefficients = this.parseCoefficients(text);

        if (coefficients.length < 2) {
            return null;
        }

        // Берем первые два коэффициента
        const [coeff1, coeff2] = coefficients.slice(0, 2);

        // Рассчитываем вероятности
        const prob1 = parseFloat((1 / coeff1 * 100).toFixed(2));
        const prob2 = parseFloat((1 / coeff2 * 100).toFixed(2));

        // Маржа букмекера
        const margin = parseFloat((100 - (prob1 + prob2)).toFixed(2));

        // Определяем рекомендацию
        const recommendation = coeff1 > coeff2 ? 'Команда 2' : 'Команда 1';

        return {
            teams: this.extractTeams(text),
            coefficients: [coeff1, coeff2],
            probabilities: [prob1, prob2],
            margin: margin,
            recommendation: recommendation,
            bookmaker: this.detectBookmaker(text),
            rawCoefficients: coefficients
        };
    }
}

module.exports = BetAnalyzer;