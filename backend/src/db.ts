import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword } from './passwords.js';

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
  const { user_version: userVersion } = await getAsync('PRAGMA user_version');
  if (userVersion < 1) {
    await runAsync('PRAGMA foreign_keys = OFF');
    for (const table of ['presence', 'planning_registrations', 'attendance', 'tool_borrows', 'sessions', 'tools', 'users']) {
      await runAsync(`DROP TABLE IF EXISTS ${table}`);
    }
  }

  await runAsync('PRAGMA foreign_keys = ON');

  await runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        passwordHash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'artisan', 'institut')),
        profilePicture TEXT,
        color TEXT NOT NULL
      )
    `);

  await runAsync(`
      CREATE TABLE IF NOT EXISTS sessions (
        tokenHash TEXT PRIMARY KEY,
        userId INTEGER NOT NULL,
        expiresAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

  await runAsync(`
      CREATE TABLE IF NOT EXISTS password_setup_tokens (
        tokenHash TEXT PRIMARY KEY,
        userId INTEGER NOT NULL,
        expiresAt TEXT NOT NULL,
        usedAt TEXT,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

  await runAsync(`
      CREATE TABLE IF NOT EXISTS planning_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        date TEXT NOT NULL,
        period TEXT NOT NULL CHECK (period IN ('morning', 'afternoon')),
        space TEXT NOT NULL CHECK (space IN ('wood', 'metal')),
        peopleCount INTEGER NOT NULL DEFAULT 1 CHECK (peopleCount BETWEEN 1 AND 3),
        note TEXT,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(userId, date, period, space)
      )
    `);

  await runAsync(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        date TEXT NOT NULL,
        present BOOLEAN NOT NULL DEFAULT 1,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
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
        FOREIGN KEY (toolId) REFERENCES tools(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

  const demoAccounts = [
    { firstName: 'Camille', lastName: 'Administrateur', email: 'admin@orgatelier.test', password: 'Admin123!', role: 'admin', color: '#2563EB' },
    { firstName: 'Lina', lastName: 'Martin', email: 'artisan@orgatelier.test', password: 'Artisan123!', role: 'artisan', color: '#D97706' },
    { firstName: 'Institut', lastName: 'Test', email: 'institut@orgatelier.test', password: 'Institut123!', role: 'institut', color: '#0F766E' },
  ] as const;

  for (const account of demoAccounts) {
    const name = `${account.firstName} ${account.lastName}`;
    await runAsync(
      `INSERT OR IGNORE INTO users (name, firstName, lastName, email, passwordHash, role, color)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, account.firstName, account.lastName, account.email, await hashPassword(account.password), account.role, account.color]
    );
  }

  await runAsync(`
      UPDATE users SET role = 'artisan'
      WHERE role = 'admin'
        AND id <> (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
    `);
  await runAsync("CREATE UNIQUE INDEX IF NOT EXISTS one_admin_account ON users(role) WHERE role = 'admin'");
  await runAsync('PRAGMA user_version = 1');
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
