import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword } from './passwords.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const dbPath = path.join(__dirname, '..', 'app.db');

export const db = new sqlite3.Database(dbPath);

type InitialAccount = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'admin' | 'artisan' | 'institut';
  color?: string;
};

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

  const { count } = await getAsync('SELECT COUNT(*) AS count FROM users');
  if (count === 0 && process.env.INITIAL_ACCOUNTS_JSON) {
    const accounts = parseInitialAccounts(process.env.INITIAL_ACCOUNTS_JSON);
    await runAsync('BEGIN IMMEDIATE');
    try {
      for (const account of accounts) {
        const name = `${account.firstName} ${account.lastName}`;
        await runAsync(
          `INSERT INTO users (name, firstName, lastName, email, passwordHash, role, color)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            name,
            account.firstName,
            account.lastName,
            account.email,
            await hashPassword(account.password),
            account.role,
            account.color ?? (account.role === 'admin' ? '#2563EB' : account.role === 'artisan' ? '#D97706' : '#0F766E'),
          ]
        );
      }
      await runAsync('COMMIT');
    } catch (error) {
      await runAsync('ROLLBACK').catch(() => undefined);
      throw error;
    }
  } else if (count === 0) {
    console.warn('No users are configured. Set INITIAL_ACCOUNTS_JSON to bootstrap an empty database.');
  }

  await runAsync(`
      UPDATE users SET role = 'artisan'
      WHERE role = 'admin'
        AND id <> (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
    `);
  await runAsync("CREATE UNIQUE INDEX IF NOT EXISTS one_admin_account ON users(role) WHERE role = 'admin'");
  await runAsync('PRAGMA user_version = 1');
}

function parseInitialAccounts(value: string): InitialAccount[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('INITIAL_ACCOUNTS_JSON must be a non-empty JSON array.');
  }

  const accounts = parsed.map((entry): InitialAccount => {
    if (!entry || typeof entry !== 'object') {
      throw new Error('Each INITIAL_ACCOUNTS_JSON entry must be an object.');
    }
    const account = entry as Record<string, unknown>;
    if (typeof account.firstName !== 'string' || !account.firstName.trim() ||
        typeof account.lastName !== 'string' || !account.lastName.trim() ||
        typeof account.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email) ||
        typeof account.password !== 'string' || !account.password ||
        !['admin', 'artisan', 'institut'].includes(String(account.role)) ||
        account.color !== undefined && (typeof account.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(account.color))) {
      throw new Error('INITIAL_ACCOUNTS_JSON contains an invalid account.');
    }
    return {
      firstName: account.firstName.trim(),
      lastName: account.lastName.trim(),
      email: account.email.trim().toLowerCase(),
      password: account.password,
      role: account.role as InitialAccount['role'],
      color: account.color as string | undefined,
    };
  });

  if (accounts.filter((account) => account.role === 'admin').length !== 1) {
    throw new Error('INITIAL_ACCOUNTS_JSON must contain exactly one admin account.');
  }
  return accounts;
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
