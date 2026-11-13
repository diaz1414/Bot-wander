import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

export interface PreparedStatement {
  get(...params: any[]): any;
  all(...params: any[]): any[];
  run(...params: any[]): { changes?: number; lastInsertRowid?: number | bigint };
}

export interface DatabaseAdapter {
  exec(sql: string): void;
  prepare(sql: string): PreparedStatement;
}

let dbInstance: DatabaseAdapter | null = null;

export function getDatabase(): DatabaseAdapter {
  if (dbInstance) return dbInstance;

  const dbPath = path.resolve(process.cwd(), config.env.databasePath);
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Check if running under Bun
  const isBun = typeof (globalThis as any).Bun !== 'undefined';

  if (isBun) {
    try {
      // Use dynamic require / import for Bun's native SQLite
      const { Database } = (globalThis as any).Bun.require
        ? (globalThis as any).Bun.require('bun:sqlite')
        : require('bun:sqlite');

      const nativeDb = new Database(dbPath, { create: true });
      nativeDb.exec('PRAGMA journal_mode = WAL;');
      nativeDb.exec('PRAGMA foreign_keys = ON;');

      dbInstance = {
        exec(sql: string) {
          nativeDb.exec(sql);
        },
        prepare(sql: string): PreparedStatement {
          const stmt = nativeDb.prepare(sql);
          return {
            get(...params: any[]) {
              return stmt.get(...params);
            },
            all(...params: any[]) {
              return stmt.all(...params);
            },
            run(...params: any[]) {
              return stmt.run(...params);
            }
          };
        }
      };

      console.log(`[DATABASE] SQLite terhubung menggunakan Bun Native Engine: ${dbPath}`);
      return dbInstance;
    } catch (err) {
      console.warn('[DATABASE] Gagal menginisialisasi bun:sqlite, mencoba fallback node:sqlite...', err);
    }
  }

  // Fallback to node:sqlite (Built-in in Node 22+)
  try {
    const { DatabaseSync } = require('node:sqlite');
    const nativeDb = new DatabaseSync(dbPath);
    nativeDb.exec('PRAGMA journal_mode = WAL;');
    nativeDb.exec('PRAGMA foreign_keys = ON;');

    dbInstance = {
      exec(sql: string) {
        nativeDb.exec(sql);
      },
      prepare(sql: string): PreparedStatement {
        const stmt = nativeDb.prepare(sql);
        return {
          get(...params: any[]) {
            return stmt.get(...params);
          },
          all(...params: any[]) {
            return stmt.all(...params);
          },
          run(...params: any[]) {
            return stmt.run(...params);
          }
        };
      }
    };

    console.log(`[DATABASE] SQLite terhubung menggunakan Node.js Engine: ${dbPath}`);
    return dbInstance;
  } catch (nodeErr) {
    console.error('[DATABASE] Fatal: Tidak dapat menginisialisasi engine SQLite!', nodeErr);
    throw new Error('SQLite Engine tidak tersedia di runtime ini.');
  }
}
