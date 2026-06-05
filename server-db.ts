import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'path';
import pg from 'pg';
import sql from 'mssql';
import { User, Project, Issue, Comment, Attachment } from './src/types';

const { Pool } = pg;

// Database Schema interface
export interface DatabaseSchema {
  users: (User & { passwordHash: string })[];
  projects: Project[];
  issues: Issue[];
  comments: Comment[];
  attachments: Attachment[];
}

const DB_FILE = path.join(process.cwd(), 'db.json');
const JWT_SECRET = process.env.JWT_SECRET || 'jira-personal-token-key-2026-secret';

// Setup connection pool if DATABASE_URL or POSTGRES_URL is available
let pool: pg.Pool | null = null;
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (dbUrl) {
  pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

// Setup MS-SQL connection pool if MSSQL_URL is available
let mssqlPool: sql.ConnectionPool | null = null;
const mssqlUrl = process.env.MSSQL_URL;

async function getMSSQLPool(): Promise<sql.ConnectionPool | null> {
  if (!mssqlUrl) return null;
  if (mssqlPool) return mssqlPool;

  try {
    const connPool = new sql.ConnectionPool(mssqlUrl);
    await connPool.connect();
    
    // Create table if it doesn't exist
    await connPool.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='jira_state' AND xtype='U')
      CREATE TABLE jira_state (
          id INT PRIMARY KEY,
          data NVARCHAR(MAX) NOT NULL
      )
    `);
    
    mssqlPool = connPool;
    console.log('Connected to MS-SQL Server and verified table schema.');
    return mssqlPool;
  } catch (error) {
    console.error('Error establishing MS-SQL Server connection:', error);
    mssqlPool = null;
    return null;
  }
}

// Read the database, initializing it if a file is missing or corrupted
export async function readDatabase(): Promise<DatabaseSchema> {
  const msql = await getMSSQLPool();
  if (msql) {
    try {
      const res = await msql.query('SELECT data FROM jira_state WHERE id = 1');
      if (res.recordset.length > 0) {
        return JSON.parse(res.recordset[0].data) as DatabaseSchema;
      }
      
      const initialDb: DatabaseSchema = {
        users: [],
        projects: [],
        issues: [],
        comments: [],
        attachments: []
      };
      
      const request = msql.request();
      request.input('data', sql.NVarChar(sql.MAX), JSON.stringify(initialDb));
      await request.query(`
        IF NOT EXISTS (SELECT 1 FROM jira_state WHERE id = 1)
        INSERT INTO jira_state (id, data) VALUES (1, @data)
      `);
      return initialDb;
    } catch (error) {
      console.error('Error reading database from MS-SQL Server:', error);
      return {
        users: [],
        projects: [],
        issues: [],
        comments: [],
        attachments: []
      };
    }
  }

  if (pool) {
    try {
      // Create table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS jira_state (
          id INT PRIMARY KEY,
          data JSONB NOT NULL
        )
      `);
      
      const res = await pool.query('SELECT data FROM jira_state WHERE id = 1');
      if (res.rows.length > 0) {
        return res.rows[0].data as DatabaseSchema;
      }
      
      const initialDb: DatabaseSchema = {
        users: [],
        projects: [],
        issues: [],
        comments: [],
        attachments: []
      };
      await pool.query(
        'INSERT INTO jira_state (id, data) VALUES (1, $1) ON CONFLICT (id) DO NOTHING',
        [JSON.stringify(initialDb)]
      );
      return initialDb;
    } catch (error) {
      console.error('Error reading database from PostgreSQL:', error);
      return {
        users: [],
        projects: [],
        issues: [],
        comments: [],
        attachments: []
      };
    }
  }

  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialDb: DatabaseSchema = {
        users: [],
        projects: [],
        issues: [],
        comments: [],
        attachments: []
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf8');
      return initialDb;
    }
    const content = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error handling database read, recovering with empty state:', error);
    return {
      users: [],
      projects: [],
      issues: [],
      comments: [],
      attachments: []
    };
  }
}

// Write the database atomically using a temporary file or database query
export async function writeDatabase(data: DatabaseSchema): Promise<void> {
  const msql = await getMSSQLPool();
  if (msql) {
    try {
      const request = msql.request();
      request.input('data', sql.NVarChar(sql.MAX), JSON.stringify(data));
      await request.query(`
        IF EXISTS (SELECT 1 FROM jira_state WHERE id = 1)
            UPDATE jira_state SET data = @data WHERE id = 1
        ELSE
            INSERT INTO jira_state (id, data) VALUES (1, @data)
      `);
      return;
    } catch (error) {
      console.error('Error writing database to MS-SQL Server:', error);
      return;
    }
  }

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO jira_state (id, data) VALUES (1, $1)
         ON CONFLICT (id) DO UPDATE SET data = $1`,
        [JSON.stringify(data)]
      );
      return;
    } catch (error) {
      console.error('Error writing database to PostgreSQL:', error);
      return;
    }
  }

  const tempFile = `${DB_FILE}.tmp`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (error) {
    console.error('Error handling atomic database write:', error);
    // Fallback sync write
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (fallbackError) {
      console.error('Fatal database write error:', fallbackError);
    }
  }
}


// CRYPTO HELPER - pbkdf2 / scrypt password hashing
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function comparePassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split(':');
    if (parts.length !== 2) return false;
    const [salt, originalHash] = parts;
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return hash === originalHash;
  } catch (e) {
    return false;
  }
}

// JWT HELPER - custom sign / verify with 0% dependency risk
export function signJWT(payload: object, expiresInSec: number = 86400): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSec;
  const h64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const p64 = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${h64}.${p64}`)
    .digest('base64url');
    
  return `${h64}.${p64}.${signature}`;
}

export function verifyJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [h64, p64, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${h64}.${p64}`)
      .digest('base64url');
      
    if (signature !== expectedSignature) return null;
    
    const payload = JSON.parse(Buffer.from(p64, 'base64url').toString('utf8'));
    
    // Check if token has expired
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}

// GENERATE UNIQUE HIGH-DENSITY ID (e.g. USER-xxxx or JIRA-xxxx)
export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}
