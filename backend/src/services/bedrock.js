import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { config } from '../config/env.js';

// Client Bedrock dibuat sekali dan dipakai ulang.
const client = new BedrockRuntimeClient({
  region: config.aws.region,
  credentials:
    config.aws.accessKeyId && config.aws.secretAccessKey
      ? {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
        }
      : undefined,
});

/**
 * Kirim prompt teks sederhana ke model di AWS Bedrock.
 * @param {string} prompt - Pertanyaan atau instruksi untuk model.
 * @returns {Promise<string>} Teks jawaban dari model.
 */
export async function askBedrock(prompt) {
  return generateNarrative({ prompt });
}

/**
 * Panggil model lewat Converse API (model-agnostic).
 * Converse menyeragamkan format request/response sehingga kode yang sama
 * bekerja untuk Amazon Nova, Anthropic Claude, dan model lain tanpa perlu
 * menyesuaikan skema per model. Dipakai fitur AI (laporan, deteksi pola,
 * ask-your-data) agar model hanya menarasikan data faktual.
 *
 * @param {object} p
 * @param {string} p.prompt   - Isi pesan user (biasanya data + instruksi).
 * @param {string=} p.system  - System prompt (aturan main untuk model).
 * @param {number=} p.maxTokens
 * @param {number=} p.temperature
 * @returns {Promise<string>}
 */
export async function generateNarrative({
  prompt,
  system,
  maxTokens = 800,
  temperature = 0.2,
}) {
  const command = new ConverseCommand({
    modelId: config.aws.bedrockModelId,
    messages: [{ role: 'user', content: [{ text: prompt }] }],
    ...(system ? { system: [{ text: system }] } : {}),
    inferenceConfig: { maxTokens, temperature },
  });

  const response = await client.send(command);
  // Converse mengembalikan output.message.content[] berisi blok teks.
  const blocks = response?.output?.message?.content ?? [];
  return blocks.map((b) => b?.text ?? '').join('').trim();
}
