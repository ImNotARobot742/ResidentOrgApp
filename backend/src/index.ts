import express from 'express';
import cors from 'cors';
import routes from './routes.js';
import { databaseReady, db } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Démarre le serveur une fois les tables et utilisateurs préenregistrés prêts.
databaseReady
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Serveur disponible sur http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Échec de l'initialisation de la base de données :", err);
    process.exitCode = 1;
  });

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) console.error(err);
    console.log('Base de données fermée.');
    process.exit(0);
  });
});
