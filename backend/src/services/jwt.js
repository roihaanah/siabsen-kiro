import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

// Buat token JWT untuk user yang sudah terautentikasi.
export function signToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

// Verifikasi token; melempar error bila tidak valid/kedaluwarsa.
export function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}
