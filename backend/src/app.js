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
