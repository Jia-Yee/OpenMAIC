import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs from 'sql.js';
import type { SqlJsStatic } from 'sql.js';
import * as schema from './schema';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';

const dbPath = process.env.DATABASE_PATH || './data/clover.db';

let sql: SqlJsStatic | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export async function initDb() {
  if (db) return db;

  // Ensure data directory exists
  if (!existsSync(dirname(dbPath))) {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  // Load WASM from public directory or use CDN
  sql = await initSqlJs({
    locateFile: (file: string) => {
      // Try local public folder first
      const localPath = `./public/${file}`;
      if (existsSync(localPath)) {
        return localPath;
      }
      // Fallback to CDN
      return `https://sql.js.org/dist/${file}`;
    },
  });

  // Load existing database or create new one
  let dbData: Uint8Array | undefined;
  if (existsSync(dbPath)) {
    dbData = readFileSync(dbPath);
  }

  const sqliteDb = new sql.Database(dbData);

  // Create tables if they don't exist
  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      openid TEXT NOT NULL UNIQUE,
      unionid TEXT,
      nickname TEXT,
      avatar_url TEXT,
      phone TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      last_login_at INTEGER
    )
  `);

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      description TEXT,
      icon_url TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    )
  `);

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS textbooks (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      name TEXT NOT NULL,
      publisher TEXT,
      grade_range TEXT,
      description TEXT,
      cover_url TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    )
  `);

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS grades (
      id TEXT PRIMARY KEY,
      textbook_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT,
      description TEXT,
      cover_url TEXT,
      price REAL DEFAULT 0,
      original_price REAL,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    )
  `);

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      grade_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      cover_url TEXT,
      video_url TEXT,
      duration INTEGER,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER
    )
  `);

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      grade_id TEXT NOT NULL,
      order_no TEXT NOT NULL UNIQUE,
      trade_no TEXT,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      paid_at INTEGER,
      expires_at INTEGER NOT NULL,
      created_at INTEGER,
      updated_at INTEGER
    )
  `);

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS wechat_sessions (
      id TEXT PRIMARY KEY,
      session_key TEXT NOT NULL UNIQUE,
      openid TEXT,
      status TEXT DEFAULT 'pending',
      qr_code_url TEXT,
      expires_at INTEGER NOT NULL,
      created_at INTEGER,
      confirmed_at INTEGER
    )
  `);

  // Create indexes
  sqliteDb.run(`CREATE INDEX IF NOT EXISTS users_openid_idx ON users(openid)`);
  sqliteDb.run(`CREATE INDEX IF NOT EXISTS textbooks_subject_idx ON textbooks(subject_id)`);
  sqliteDb.run(`CREATE INDEX IF NOT EXISTS grades_textbook_idx ON grades(textbook_id)`);
  sqliteDb.run(`CREATE INDEX IF NOT EXISTS courses_grade_idx ON courses(grade_id)`);
  sqliteDb.run(`CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions(user_id)`);
  sqliteDb.run(`CREATE INDEX IF NOT EXISTS subscriptions_grade_idx ON subscriptions(grade_id)`);
  sqliteDb.run(`CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status)`);
  sqliteDb.run(`CREATE INDEX IF NOT EXISTS wechat_sessions_session_key_idx ON wechat_sessions(session_key)`);

  db = drizzle(sqliteDb, { schema });

  // Seed initial data if empty
  const existingSubjects = sqliteDb.exec('SELECT COUNT(*) as count FROM subjects');
  if (existingSubjects[0]?.values[0]?.[0] === 0) {
    // Seed subjects
    sqliteDb.run(`INSERT INTO subjects (id, name, code, description, sort_order) VALUES 
      ('subject-math', '数学', 'math', '数学思维训练课程', 0),
      ('subject-chinese', '语文', 'chinese', '语文阅读与写作课程', 1),
      ('subject-english', '英语', 'english', '英语听说读写训练', 2)
    `);

    // Seed textbooks
    sqliteDb.run(`INSERT INTO textbooks (id, subject_id, name, publisher, grade_range, sort_order) VALUES 
      ('textbook-math-rjb', 'subject-math', '人教版', '人民教育出版社', '1-6年级', 0),
      ('textbook-math-bsdb', 'subject-math', '北师大版', '北京师范大学出版社', '1-6年级', 1),
      ('textbook-math-sjb', 'subject-math', '苏教版', '江苏教育出版社', '1-6年级', 2)
    `);

    // Seed grades (人教版)
    sqliteDb.run(`INSERT INTO grades (id, textbook_id, name, price, sort_order) VALUES 
      ('grade-rjb-1a', 'textbook-math-rjb', '一年级上册', 199, 0),
      ('grade-rjb-1b', 'textbook-math-rjb', '一年级下册', 199, 1),
      ('grade-rjb-2a', 'textbook-math-rjb', '二年级上册', 199, 2),
      ('grade-rjb-2b', 'textbook-math-rjb', '二年级下册', 199, 3),
      ('grade-rjb-3a', 'textbook-math-rjb', '三年级上册', 249, 4),
      ('grade-rjb-3b', 'textbook-math-rjb', '三年级下册', 249, 5)
    `);

    // Seed courses for all grades
    // 一年级上册
    sqliteDb.run(`INSERT INTO courses (id, grade_id, title, description, sort_order) VALUES 
      ('course-rjb-1a-01', 'grade-rjb-1a', '数一数', '认识1-10以内的数', 0),
      ('course-rjb-1a-02', 'grade-rjb-1a', '比一比', '学习比较大小、长短、高矮', 1),
      ('course-rjb-1a-03', 'grade-rjb-1a', '1-5的认识和加减法', '认识数字1-5，学习加减法', 2),
      ('course-rjb-1a-04', 'grade-rjb-1a', '认识图形（一）', '认识基本的平面图形', 3),
      ('course-rjb-1a-05', 'grade-rjb-1a', '6-10的认识和加减法', '认识数字6-10，学习加减法', 4)
    `);
    
    // 一年级下册
    sqliteDb.run(`INSERT INTO courses (id, grade_id, title, description, sort_order) VALUES 
      ('course-rjb-1b-01', 'grade-rjb-1b', '认识图形（二）', '认识更多的平面图形', 0),
      ('course-rjb-1b-02', 'grade-rjb-1b', '20以内的退位减法', '学习退位减法', 1),
      ('course-rjb-1b-03', 'grade-rjb-1b', '分类与整理', '学习分类方法', 2),
      ('course-rjb-1b-04', 'grade-rjb-1b', '100以内数的认识', '认识100以内的数', 3),
      ('course-rjb-1b-05', 'grade-rjb-1b', '认识人民币', '学习人民币的使用', 4)
    `);
    
    // 二年级上册
    sqliteDb.run(`INSERT INTO courses (id, grade_id, title, description, sort_order) VALUES 
      ('course-rjb-2a-01', 'grade-rjb-2a', '长度单位', '认识厘米和米', 0),
      ('course-rjb-2a-02', 'grade-rjb-2a', '100以内的加法和减法（二）', '进位加法和退位减法', 1),
      ('course-rjb-2a-03', 'grade-rjb-2a', '角的初步认识', '认识角的概念', 2),
      ('course-rjb-2a-04', 'grade-rjb-2a', '表内乘法（一）', '学习乘法口诀', 3),
      ('course-rjb-2a-05', 'grade-rjb-2a', '观察物体', '从不同角度观察', 4)
    `);
    
    // 二年级下册
    sqliteDb.run(`INSERT INTO courses (id, grade_id, title, description, sort_order) VALUES 
      ('course-rjb-2b-01', 'grade-rjb-2b', '数据收集整理', '学习统计方法', 0),
      ('course-rjb-2b-02', 'grade-rjb-2b', '表内除法（一）', '学习除法概念', 1),
      ('course-rjb-2b-03', 'grade-rjb-2b', '图形的运动', '学习平移和旋转', 2),
      ('course-rjb-2b-04', 'grade-rjb-2b', '表内除法（二）', '继续学习除法', 3),
      ('course-rjb-2b-05', 'grade-rjb-2b', '混合运算', '学习运算顺序', 4)
    `);
    
    // 三年级上册
    sqliteDb.run(`INSERT INTO courses (id, grade_id, title, description, sort_order) VALUES 
      ('course-rjb-3a-01', 'grade-rjb-3a', '时、分、秒', '认识时间单位', 0),
      ('course-rjb-3a-02', 'grade-rjb-3a', '万以内的加法和减法（一）', '大数加减法', 1),
      ('course-rjb-3a-03', 'grade-rjb-3a', '测量', '认识毫米、分米、千米', 2),
      ('course-rjb-3a-04', 'grade-rjb-3a', '倍的认识', '学习倍数概念', 3),
      ('course-rjb-3a-05', 'grade-rjb-3a', '多位数乘一位数', '学习乘法运算', 4)
    `);
    
    // 三年级下册
    sqliteDb.run(`INSERT INTO courses (id, grade_id, title, description, sort_order) VALUES 
      ('course-rjb-3b-01', 'grade-rjb-3b', '位置与方向', '认识八个方向', 0),
      ('course-rjb-3b-02', 'grade-rjb-3b', '除数是一位数的除法', '学习除法运算', 1),
      ('course-rjb-3b-03', 'grade-rjb-3b', '复式统计表', '学习复杂统计', 2),
      ('course-rjb-3b-04', 'grade-rjb-3b', '两位数乘两位数', '学习乘法运算', 3),
      ('course-rjb-3b-05', 'grade-rjb-3b', '面积', '认识面积单位', 4)
    `);

    console.log('Database seeded with initial data');
  }

  // Auto-save on process exit
  const saveDb = () => {
    if (sqliteDb && existsSync(dirname(dbPath))) {
      const data = sqliteDb.export();
      writeFileSync(dbPath, Buffer.from(data));
    }
  };

  process.on('exit', saveDb);
  process.on('SIGINT', () => {
    saveDb();
    process.exit(0);
  });

  return db;
}

// Synchronous getter for after init
export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

// For backward compatibility - will be null until initDb is called
export { db as _db };

export type Database = ReturnType<typeof drizzle>;
