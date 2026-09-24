import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'app.db');

export const db = new sqlite3.Database(dbPath);

export const databaseReady = new Promise<void>((resolve, reject) => {
  db.once('error', reject);
  db.once('open', () => {
    console.log('Connexion à la base SQLite établie');
    initializeDatabase().then(resolve).catch(reject);
  });
});

async function initializeDatabase() {
  await runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT NOT NULL
      )
    `);

  await runAsync(`
      INSERT OR IGNORE INTO users (name, color) VALUES
        ('Alice', '#EF4444'),
        ('Bob', '#3B82F6'),
        ('Charlie', '#22C55E'),
        ('Diana', '#F97316'),
        ('Visiteur', '#94A3B8')
    `);

  await runAsync(`
      CREATE TABLE IF NOT EXISTS presence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'present',
        activity TEXT,
        note TEXT,
        FOREIGN KEY (userId) REFERENCES users(id),
        UNIQUE(userId, date)
      )
    `);

  // Add fields when upgrading an existing prototype database.
  for (const column of ['activity TEXT', 'note TEXT']) {
    try {
      await runAsync(`ALTER TABLE presence ADD COLUMN ${column}`);
    } catch (error: any) {
      if (!error.message.includes('duplicate column name')) throw error;
    }
  }

  await runAsync(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        date TEXT NOT NULL,
        present BOOLEAN NOT NULL DEFAULT 1,
        FOREIGN KEY (userId) REFERENCES users(id),
        UNIQUE(userId, date)
      )
    `);

  await runAsync(`
      CREATE TABLE IF NOT EXISTS tools (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        available BOOLEAN NOT NULL DEFAULT 1
      )
    `);

  await runAsync(`
      CREATE TABLE IF NOT EXISTS tool_borrows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        toolId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        borrowDate TEXT NOT NULL,
        returnDate TEXT,
        FOREIGN KEY (toolId) REFERENCES tools(id),
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);
}

export function runAsync(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

export function getAsync(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function allAsync(sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}
