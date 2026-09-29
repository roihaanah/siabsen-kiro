import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());
  if (config.nodeEnv !== 'test') {
    app.use(morgan('dev'));
  }

  app.get('/', (_req, res) => {
    res.json({ name: 'siabsen-backend', version: '0.1.0' });
  });

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

// Default export berupa instance Express app agar kompatibel dengan deteksi
// entry point Vercel (yang memindai src/app.js dan mengharuskan default export
// berupa app/handler, bukan fungsi factory). Routing, auth, DB, dan fitur AI
// tidak berubah — ini hanya instance dari createApp().
const app = createApp();
export default app;
