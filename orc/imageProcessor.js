const { createWorker } = require('tesseract.js');
const fetch = require('node-fetch');
const sharp = require('sharp');

class ImageProcessor {
    constructor() {
        this.worker = null;
        this.initWorker();
    }

    async initWorker() {
        this.worker = await createWorker('rus+eng');
    }

    async preprocessImage(buffer) {
        try {
            return await sharp(buffer)
                .grayscale()
                .normalize()
                .sharpen()
                .toBuffer();
        } catch (error) {
            console.error('Image preprocessing error:', error);
            return buffer;
        }
    }

    async extractTextFromImage(imageUrl) {
        try {
            // Скачиваем изображение
            const response = await fetch(imageUrl);
            const buffer = await response.buffer();

            // Предобработка
            const processedBuffer = await this.preprocessImage(buffer);

            // Распознавание текста
            const { data: { text } } = await this.worker.recognize(processedBuffer);

            return text.toLowerCase();
        } catch (error) {
            console.error('OCR Error:', error);
            return null;
        }
    }

    async destroy() {
        if (this.worker) {
            await this.worker.terminate();
        }
    }
}

module.exports = ImageProcessor;