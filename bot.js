// Для корректной работы на Railway
process.env.NTBA_FIX_319 = "1";
process.env.NTBA_FIX_350 = "1";

// Обработка ошибок
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createWorker } = require('tesseract.js');
const fetch = require('node-fetch');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Упрощенный обработчик изображений (без sharp)
async function processImage(imageUrl) {
    try {
        console.log('Downloading image...');
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log('OCR processing...');
        const worker = await createWorker('rus+eng');
        const { data: { text } } = await worker.recognize(buffer);
        await worker.terminate();

        console.log('Recognized text length:', text.length);
        return text.toLowerCase();
    } catch (error) {
        console.error('OCR Error:', error);
        return null;
    }
}

// Анализ коэффициентов
function analyzeBet(text) {
    console.log('Analyzing text for coefficients...');

    const decimalPattern = /\d+[.,]\d+/g;
    const fractionalPattern = /\d+\/\d+/g;

    const decimalMatches = text.match(decimalPattern) || [];
    const fractionalMatches = text.match(fractionalPattern) || [];

    const coefficients = [];

    decimalMatches.forEach(match => {
        const coeff = parseFloat(match.replace(',', '.'));
        if (coeff > 1.0 && coeff < 100.0) {
            coefficients.push(coeff);
        }
    });

    fractionalMatches.forEach(match => {
        const [numerator, denominator] = match.split('/').map(Number);
        if (numerator && denominator && denominator !== 0) {
            const coeff = parseFloat((numerator / denominator).toFixed(2));
            if (coeff > 1.0 && coeff < 100.0) {
                coefficients.push(coeff);
            }
        }
    });

    console.log('Found coefficients:', coefficients);

    if (coefficients.length < 2) {
        return null;
    }

    const [coeff1, coeff2] = coefficients.slice(0, 2);
    const prob1 = (1 / coeff1 * 100).toFixed(2);
    const prob2 = (1 / coeff2 * 100).toFixed(2);
    const margin = (100 - (parseFloat(prob1) + parseFloat(prob2))).toFixed(2);

    const teamPattern = /([а-яa-z]+\s+[а-яa-z]+)\s+(?:vs|против|against|-)\s+([а-яa-z]+\s+[а-яa-z]+)/i;
    const teamMatch = text.match(teamPattern);
    const teams = teamMatch ? [teamMatch[1], teamMatch[2]] : ['Команда 1', 'Команда 2'];

    return {
        teams: teams,
        coefficients: [coeff1, coeff2],
        probabilities: [prob1, prob2],
        margin: margin,
        recommendation: coeff1 > coeff2 ? teams[1] : teams[0]
    };
}

// Обработчики бота
bot.start((ctx) => {
    const welcomeText = `🏆 Бот для анализа спортивных ставок!

Отправьте скриншот с коэффициентами матча, и я проанализирую шансы команд.

Просто отправьте скриншот!`;

    ctx.reply(welcomeText);
});

bot.on('photo', async (ctx) => {
    try {
        await ctx.reply('🔍 Анализирую скриншот...');

        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

        console.log('Processing photo from:', fileUrl);

        const text = await processImage(fileUrl);

        if (!text) {
            await ctx.reply('❌ Не удалось распознать текст на изображении');
            return;
        }

        const analysis = analyzeBet(text);

        if (analysis) {
            const response = `🏆 Анализ матча:
${analysis.teams[0]} vs ${analysis.teams[1]}

📊 Коэффициенты:
${analysis.teams[0]}: ${analysis.coefficients[0]}
${analysis.teams[1]}: ${analysis.coefficients[1]}

🎯 Вероятности победы:
${analysis.teams[0]}: ${analysis.probabilities[0]}%
${analysis.teams[1]}: ${analysis.probabilities[1]}%

📈 Маржа букмекера: ${analysis.margin}%

💡 Рекомендация: ${analysis.recommendation}

⚠️ Анализ仅供参考!`;

            await ctx.reply(response);
        } else {
            await ctx.reply('❌ Не найдены коэффициенты на изображении');
        }

    } catch (error) {
        console.error('Error processing photo:', error);
        await ctx.reply('❌ Произошла ошибка при обработке изображения');
    }
});

bot.on('text', (ctx) => {
    ctx.reply('📸 Отправьте скриншот с коэффициентами для анализа');
});

// Запуск бота
console.log('🚀 Starting bot...');
bot.launch().then(() => {
    console.log('✅ Bot started successfully!');
}).catch(error => {
    console.error('❌ Bot startup failed:', error);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));