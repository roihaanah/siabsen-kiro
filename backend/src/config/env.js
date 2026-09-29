import dotenv from 'dotenv';

dotenv.config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    console.warn(`[env] Variabel ${name} belum di-set.`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  database: {
    url: required('DATABASE_URL'),
    ssl: String(process.env.DATABASE_SSL || 'false').toLowerCase() === 'true',
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    // Model dipanggil lewat Converse API (model-agnostic), jadi Nova/Claude/lain
    // memakai kode yang sama. Bisa dioverride via env BEDROCK_MODEL_ID.
    bedrockModelId: process.env.BEDROCK_MODEL_ID || 'amazon.nova-lite-v1:0',
  },
  jwt: {
    // Wajib di-set di .env. Tidak ada nilai rahasia hardcode di source.
    secret: required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
};
