import { sql, createPool } from '@vercel/postgres';
import * as schema from './schema';
import { drizzle } from 'drizzle-orm/vercel-postgres';

let db: ReturnType<typeof drizzle> | null = null;

export async function initDb() {
  if (db) return db;

  if (process.env.POSTGRES_URL) {
    const pool = createPool({
      connectionString: process.env.POSTGRES_URL,
    });
    db = drizzle(pool, { schema });
    await ensurePgTables();
  } else {
    const { drizzle: drizzleSql } = await import('drizzle-orm/sql-js');
    const initSqlJs = await import('sql.js');
    const { mkdirSync, existsSync, readFileSync, writeFileSync } = await import('fs');
    const { dirname, join } = await import('path');
    
    const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'clover.db');
    
    if (!existsSync(dirname(dbPath))) {
      mkdirSync(dirname(dbPath), { recursive: true });
    }

    const sql = await initSqlJs.default({
      locateFile: (file: string) => {
        const localPath = `./public/${file}`;
        if (existsSync(localPath)) {
          return localPath;
        }
        return `https://sql.js.org/dist/${file}`;
      },
    });

    let dbData: Uint8Array | undefined;
    if (existsSync(dbPath)) {
      dbData = readFileSync(dbPath);
    }

    const sqliteDb = new sql.Database(dbData);
    ensureSqliteTables(sqliteDb);
    db = drizzleSql(sqliteDb, { schema });

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
  }

  return db;
}

async function ensurePgTables() {
  try {
    const queryResult = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subjects'`;
    
    if (!queryResult.rows.length) {
      console.log('Creating PostgreSQL tables...');
      await sql`
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          openid TEXT NOT NULL UNIQUE,
          unionid TEXT,
          nickname TEXT,
          avatar_url TEXT,
          phone TEXT,
          password TEXT,
          is_admin BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login_at TIMESTAMP
        );
        
        CREATE TABLE subjects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT UNIQUE,
          description TEXT,
          icon_url TEXT,
          sort_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE
        );
        
        CREATE TABLE textbooks (
          id TEXT PRIMARY KEY,
          subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          publisher TEXT,
          grade_range TEXT,
          description TEXT,
          cover_url TEXT,
          sort_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE
        );
        
        CREATE TABLE grades (
          id TEXT PRIMARY KEY,
          textbook_id TEXT NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          code TEXT,
          description TEXT,
          cover_url TEXT,
          price NUMERIC DEFAULT 0,
          original_price NUMERIC,
          sort_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE
        );
        
        CREATE TABLE courses (
          id TEXT PRIMARY KEY,
          grade_id TEXT NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          cover_url TEXT,
          video_url TEXT,
          classroom_id TEXT,
          duration INTEGER,
          sort_order INTEGER DEFAULT 0,
          semester TEXT DEFAULT 'full',
          is_active BOOLEAN DEFAULT TRUE,
          is_free BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE course_prerequisites (
          id TEXT PRIMARY KEY,
          course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          prerequisite_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE user_grades (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          grade_id TEXT NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE subscriptions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          grade_id TEXT NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
          order_no TEXT NOT NULL UNIQUE,
          trade_no TEXT,
          amount NUMERIC NOT NULL,
          status TEXT DEFAULT 'pending' NOT NULL,
          paid_at TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE learning_progress (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          progress INTEGER DEFAULT 0,
          completed BOOLEAN DEFAULT FALSE,
          stars INTEGER DEFAULT 0,
          last_access_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE wechat_sessions (
          id TEXT PRIMARY KEY,
          session_key TEXT NOT NULL UNIQUE,
          openid TEXT,
          status TEXT DEFAULT 'pending' NOT NULL,
          qr_code_url TEXT,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          confirmed_at TIMESTAMP
        );
        
        CREATE INDEX users_openid_idx ON users(openid);
        CREATE INDEX textbooks_subject_idx ON textbooks(subject_id);
        CREATE INDEX grades_textbook_idx ON grades(textbook_id);
        CREATE INDEX courses_grade_idx ON courses(grade_id);
        CREATE INDEX subscriptions_user_idx ON subscriptions(user_id);
        CREATE INDEX subscriptions_grade_idx ON subscriptions(grade_id);
        CREATE INDEX subscriptions_status_idx ON subscriptions(status);
        CREATE INDEX wechat_sessions_session_key_idx ON wechat_sessions(session_key);
        CREATE UNIQUE INDEX course_prerequisites_unique ON course_prerequisites(course_id, prerequisite_id);
      `;
      
      await seedInitialData();
    }
  } catch (error) {
    console.error('Error ensuring PostgreSQL tables:', error);
  }
}

function ensureSqliteTables(sqliteDb: any) {
  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      openid TEXT NOT NULL UNIQUE,
      unionid TEXT,
      nickname TEXT,
      avatar_url TEXT,
      phone TEXT,
      password TEXT,
      is_admin INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER,
      last_login_at INTEGER
    )
  `);

  const columnsResult = sqliteDb.exec(`PRAGMA table_info(users)`);
  const columns = columnsResult[0]?.values || [];
  const hasPasswordColumn = columns.some((col: any[]) => col[1] === 'password');
  if (!hasPasswordColumn) {
    sqliteDb.run(`ALTER TABLE users ADD COLUMN password TEXT`);
  }

  const hasIsAdminColumn = columns.some((col: any[]) => col[1] === 'is_admin');
  if (!hasIsAdminColumn) {
    sqliteDb.run(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`);
  }

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

  const coursesColumnsResult = sqliteDb.exec(`PRAGMA table_info(courses)`);
  const coursesColumns = coursesColumnsResult[0]?.values || [];
  const hasIsFreeColumn = coursesColumns.some((col: any[]) => col[1] === 'is_free');
  if (!hasIsFreeColumn) {
    sqliteDb.run(`ALTER TABLE courses ADD COLUMN is_free INTEGER DEFAULT 0`);
  }

  const hasSemesterColumn = coursesColumns.some((col: any[]) => col[1] === 'semester');
  if (!hasSemesterColumn) {
    sqliteDb.run(`ALTER TABLE courses ADD COLUMN semester TEXT DEFAULT 'full'`);
  }

  const hasClassroomIdColumn = coursesColumns.some((col: any[]) => col[1] === 'classroom_id');
  if (!hasClassroomIdColumn) {
    sqliteDb.run(`ALTER TABLE courses ADD COLUMN classroom_id TEXT`);
  }

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS course_prerequisites (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      prerequisite_id TEXT NOT NULL,
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

  sqliteDb.run(`CREATE INDEX IF NOT EXISTS users_openid_idx ON users(openid)`);
  sqliteDb.run(`CREATE INDEX IF NOT EXISTS textbooks_subject_idx ON textbooks(subject_id)`);
  sqliteDb.run(`CREATE INDEX IF NOT EXISTS grades_textbook_idx ON grades(textbook_id)`);
  sqliteDb.run(`CREATE INDEX IF NOT EXISTS courses_grade_idx ON courses(grade_id)`);
  sqliteDb.run(`CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions(user_id)`);
  sqliteDb.run(`CREATE INDEX IF NOT EXISTS subscriptions_grade_idx ON subscriptions(grade_id)`);
  sqliteDb.run(`CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status)`);
  sqliteDb.run(`CREATE INDEX IF NOT EXISTS wechat_sessions_session_key_idx ON wechat_sessions(session_key)`);

  seedSqliteInitialData(sqliteDb);
}

async function seedInitialData() {
  try {
    const subjectsResult = await sql`SELECT COUNT(*) FROM subjects`;
    const subjectsEmpty = parseInt(subjectsResult.rows[0]?.count || '0') === 0;
    
    if (subjectsEmpty) {
      console.log('Seeding initial data...');
      
      await sql`
        INSERT INTO subjects (id, name, code, description, sort_order) VALUES 
          ('subject-math', '数学', 'math', '数学思维训练课程', 0),
          ('subject-chinese', '语文', 'chinese', '语文阅读与写作课程', 1),
          ('subject-english', '英语', 'english', '英语听说读写训练', 2)
      `;

      await sql`
        INSERT INTO textbooks (id, subject_id, name, publisher, grade_range, sort_order) VALUES 
          ('textbook-math-rjb', 'subject-math', '人教版', '人民教育出版社', '1-6年级', 0),
          ('textbook-math-bsdb', 'subject-math', '北师大版', '北京师范大学出版社', '1-6年级', 1),
          ('textbook-math-sjb', 'subject-math', '苏教版', '江苏教育出版社', '1-6年级', 2)
      `;

      await sql`
        INSERT INTO grades (id, textbook_id, name, price, sort_order) VALUES 
          ('grade-rjb-1a', 'textbook-math-rjb', '一年级上册', 199, 0),
          ('grade-rjb-1b', 'textbook-math-rjb', '一年级下册', 199, 1),
          ('grade-rjb-2a', 'textbook-math-rjb', '二年级上册', 199, 2),
          ('grade-rjb-2b', 'textbook-math-rjb', '二年级下册', 199, 3),
          ('grade-rjb-3a', 'textbook-math-rjb', '三年级上册', 249, 4),
          ('grade-rjb-3b', 'textbook-math-rjb', '三年级下册', 249, 5),
          ('grade-rjb-4a', 'textbook-math-rjb', '四年级上册', 249, 6),
          ('grade-rjb-4b', 'textbook-math-rjb', '四年级下册', 249, 7),
          ('grade-rjb-5a', 'textbook-math-rjb', '五年级上册', 299, 8),
          ('grade-rjb-5b', 'textbook-math-rjb', '五年级下册', 299, 9),
          ('grade-rjb-6a', 'textbook-math-rjb', '六年级上册', 299, 10),
          ('grade-rjb-6b', 'textbook-math-rjb', '六年级下册', 299, 11)
      `;

      await sql`
        INSERT INTO courses (id, grade_id, title, description, sort_order) VALUES 
          ('course-rjb-1a-01', 'grade-rjb-1a', '数一数', '认识1-10以内的数', 0),
          ('course-rjb-1a-02', 'grade-rjb-1a', '比一比', '学习比较大小、长短、高矮', 1),
          ('course-rjb-1a-03', 'grade-rjb-1a', '1-5的认识和加减法', '认识数字1-5，学习加减法', 2),
          ('course-rjb-1a-04', 'grade-rjb-1a', '认识图形（一）', '认识基本的平面图形', 3),
          ('course-rjb-1a-05', 'grade-rjb-1a', '6-10的认识和加减法', '认识数字6-10，学习加减法', 4),
          ('course-rjb-1b-01', 'grade-rjb-1b', '认识图形（二）', '认识更多的平面图形', 0),
          ('course-rjb-1b-02', 'grade-rjb-1b', '20以内的退位减法', '学习退位减法', 1),
          ('course-rjb-1b-03', 'grade-rjb-1b', '分类与整理', '学习分类方法', 2),
          ('course-rjb-1b-04', 'grade-rjb-1b', '100以内数的认识', '认识100以内的数', 3),
          ('course-rjb-1b-05', 'grade-rjb-1b', '认识人民币', '学习人民币的使用', 4),
          ('course-rjb-2a-01', 'grade-rjb-2a', '长度单位', '认识厘米和米', 0),
          ('course-rjb-2a-02', 'grade-rjb-2a', '100以内的加法和减法（二）', '进位加法和退位减法', 1),
          ('course-rjb-2a-03', 'grade-rjb-2a', '角的初步认识', '认识角的概念', 2),
          ('course-rjb-2a-04', 'grade-rjb-2a', '表内乘法（一）', '学习乘法口诀', 3),
          ('course-rjb-2a-05', 'grade-rjb-2a', '观察物体', '从不同角度观察', 4),
          ('course-rjb-2b-01', 'grade-rjb-2b', '数据收集整理', '学习统计方法', 0),
          ('course-rjb-2b-02', 'grade-rjb-2b', '表内除法（一）', '学习除法概念', 1),
          ('course-rjb-2b-03', 'grade-rjb-2b', '图形的运动', '学习平移和旋转', 2),
          ('course-rjb-2b-04', 'grade-rjb-2b', '表内除法（二）', '继续学习除法', 3),
          ('course-rjb-2b-05', 'grade-rjb-2b', '混合运算', '学习运算顺序', 4),
          ('course-rjb-3a-01', 'grade-rjb-3a', '时、分、秒', '认识时间单位', 0),
          ('course-rjb-3a-02', 'grade-rjb-3a', '万以内的加法和减法（一）', '大数加减法', 1),
          ('course-rjb-3a-03', 'grade-rjb-3a', '测量', '认识毫米、分米、千米', 2),
          ('course-rjb-3a-04', 'grade-rjb-3a', '倍的认识', '学习倍数概念', 3),
          ('course-rjb-3a-05', 'grade-rjb-3a', '多位数乘一位数', '学习乘法运算', 4),
          ('course-rjb-3b-01', 'grade-rjb-3b', '位置与方向', '认识八个方向', 0),
          ('course-rjb-3b-02', 'grade-rjb-3b', '除数是一位数的除法', '学习除法运算', 1),
          ('course-rjb-3b-03', 'grade-rjb-3b', '复式统计表', '学习复杂统计', 2),
          ('course-rjb-3b-04', 'grade-rjb-3b', '两位数乘两位数', '学习乘法运算', 3),
          ('course-rjb-3b-05', 'grade-rjb-3b', '面积', '认识面积单位', 4),
          ('course-rjb-4a-01', 'grade-rjb-4a', '大数的认识', '学习大数读写', 0),
          ('course-rjb-4a-02', 'grade-rjb-4a', '公顷和平方千米', '认识面积单位', 1),
          ('course-rjb-4a-03', 'grade-rjb-4a', '角的度量', '学习角的测量', 2),
          ('course-rjb-4a-04', 'grade-rjb-4a', '三位数乘两位数', '学习乘法运算', 3),
          ('course-rjb-4a-05', 'grade-rjb-4a', '平行四边形和梯形', '认识图形', 4),
          ('course-rjb-4b-01', 'grade-rjb-4b', '四则运算', '学习四则混合运算', 0),
          ('course-rjb-4b-02', 'grade-rjb-4b', '运算定律', '学习简便运算', 1),
          ('course-rjb-4b-03', 'grade-rjb-4b', '小数的意义和性质', '学习小数', 2),
          ('course-rjb-4b-04', 'grade-rjb-4b', '小数的加法和减法', '学习小数运算', 3),
          ('course-rjb-4b-05', 'grade-rjb-4b', '图形的运动', '学习对称和平移', 4),
          ('course-rjb-5a-01', 'grade-rjb-5a', '小数乘法', '学习小数乘法', 0),
          ('course-rjb-5a-02', 'grade-rjb-5a', '位置', '学习坐标', 1),
          ('course-rjb-5a-03', 'grade-rjb-5a', '小数除法', '学习小数除法', 2),
          ('course-rjb-5a-04', 'grade-rjb-5a', '可能性', '学习概率', 3),
          ('course-rjb-5a-05', 'grade-rjb-5a', '简易方程', '学习方程', 4),
          ('course-rjb-5b-01', 'grade-rjb-5b', '观察物体', '立体图形观察', 0),
          ('course-rjb-5b-02', 'grade-rjb-5b', '因数和倍数', '学习数论', 1),
          ('course-rjb-5b-03', 'grade-rjb-5b', '长方体和正方体', '认识立体图形', 2),
          ('course-rjb-5b-04', 'grade-rjb-5b', '分数的意义和性质', '学习分数', 3),
          ('course-rjb-5b-05', 'grade-rjb-5b', '图形的运动', '学习旋转', 4),
          ('course-rjb-6a-01', 'grade-rjb-6a', '分数乘法', '学习分数乘法', 0),
          ('course-rjb-6a-02', 'grade-rjb-6a', '位置与方向', '学习方向和距离', 1),
          ('course-rjb-6a-03', 'grade-rjb-6a', '分数除法', '学习分数除法', 2),
          ('course-rjb-6a-04', 'grade-rjb-6a', '比', '学习比的概念', 3),
          ('course-rjb-6a-05', 'grade-rjb-6a', '圆', '认识圆的特性', 4),
          ('course-rjb-6b-01', 'grade-rjb-6b', '负数', '认识负数', 0),
          ('course-rjb-6b-02', 'grade-rjb-6b', '百分数', '学习百分数', 1),
          ('course-rjb-6b-03', 'grade-rjb-6b', '圆柱与圆锥', '认识立体图形', 2),
          ('course-rjb-6b-04', 'grade-rjb-6b', '比例', '学习比例关系', 3),
          ('course-rjb-6b-05', 'grade-rjb-6b', '整理和复习', '总复习', 4)
      `;

      console.log('Database seeded with initial data');
    }
  } catch (error) {
    console.error('Error seeding initial data:', error);
  }
}

function seedSqliteInitialData(sqliteDb: any) {
  const existingSubjects = sqliteDb.exec('SELECT COUNT(*) as count FROM subjects');
  const existingCourses = sqliteDb.exec('SELECT COUNT(*) as count FROM courses');
  const subjectsEmpty = existingSubjects[0]?.values[0]?.[0] === 0;
  const coursesEmpty = existingCourses[0]?.values[0]?.[0] === 0;

  if (subjectsEmpty) {
    sqliteDb.run(`INSERT INTO subjects (id, name, code, description, sort_order) VALUES 
      ('subject-math', '数学', 'math', '数学思维训练课程', 0),
      ('subject-chinese', '语文', 'chinese', '语文阅读与写作课程', 1),
      ('subject-english', '英语', 'english', '英语听说读写训练', 2)
    `);

    sqliteDb.run(`INSERT INTO textbooks (id, subject_id, name, publisher, grade_range, sort_order) VALUES 
      ('textbook-math-rjb', 'subject-math', '人教版', '人民教育出版社', '1-6年级', 0),
      ('textbook-math-bsdb', 'subject-math', '北师大版', '北京师范大学出版社', '1-6年级', 1),
      ('textbook-math-sjb', 'subject-math', '苏教版', '江苏教育出版社', '1-6年级', 2)
    `);

    sqliteDb.run(`INSERT INTO grades (id, textbook_id, name, price, sort_order) VALUES 
      ('grade-rjb-1a', 'textbook-math-rjb', '一年级上册', 199, 0),
      ('grade-rjb-1b', 'textbook-math-rjb', '一年级下册', 199, 1),
      ('grade-rjb-2a', 'textbook-math-rjb', '二年级上册', 199, 2),
      ('grade-rjb-2b', 'textbook-math-rjb', '二年级下册', 199, 3),
      ('grade-rjb-3a', 'textbook-math-rjb', '三年级上册', 249, 4),
      ('grade-rjb-3b', 'textbook-math-rjb', '三年级下册', 249, 5),
      ('grade-rjb-4a', 'textbook-math-rjb', '四年级上册', 249, 6),
      ('grade-rjb-4b', 'textbook-math-rjb', '四年级下册', 249, 7),
      ('grade-rjb-5a', 'textbook-math-rjb', '五年级上册', 299, 8),
      ('grade-rjb-5b', 'textbook-math-rjb', '五年级下册', 299, 9),
      ('grade-rjb-6a', 'textbook-math-rjb', '六年级上册', 299, 10),
      ('grade-rjb-6b', 'textbook-math-rjb', '六年级下册', 299, 11)
    `);

    sqliteDb.run(`INSERT INTO courses (id, grade_id, title, description, sort_order) VALUES 
      ('course-rjb-1a-01', 'grade-rjb-1a', '数一数', '认识1-10以内的数', 0),
      ('course-rjb-1a-02', 'grade-rjb-1a', '比一比', '学习比较大小、长短、高矮', 1),
      ('course-rjb-1a-03', 'grade-rjb-1a', '1-5的认识和加减法', '认识数字1-5，学习加减法', 2),
      ('course-rjb-1a-04', 'grade-rjb-1a', '认识图形（一）', '认识基本的平面图形', 3),
      ('course-rjb-1a-05', 'grade-rjb-1a', '6-10的认识和加减法', '认识数字6-10，学习加减法', 4),
      ('course-rjb-1b-01', 'grade-rjb-1b', '认识图形（二）', '认识更多的平面图形', 0),
      ('course-rjb-1b-02', 'grade-rjb-1b', '20以内的退位减法', '学习退位减法', 1),
      ('course-rjb-1b-03', 'grade-rjb-1b', '分类与整理', '学习分类方法', 2),
      ('course-rjb-1b-04', 'grade-rjb-1b', '100以内数的认识', '认识100以内的数', 3),
      ('course-rjb-1b-05', 'grade-rjb-1b', '认识人民币', '学习人民币的使用', 4),
      ('course-rjb-2a-01', 'grade-rjb-2a', '长度单位', '认识厘米和米', 0),
      ('course-rjb-2a-02', 'grade-rjb-2a', '100以内的加法和减法（二）', '进位加法和退位减法', 1),
      ('course-rjb-2a-03', 'grade-rjb-2a', '角的初步认识', '认识角的概念', 2),
      ('course-rjb-2a-04', 'grade-rjb-2a', '表内乘法（一）', '学习乘法口诀', 3),
      ('course-rjb-2a-05', 'grade-rjb-2a', '观察物体', '从不同角度观察', 4),
      ('course-rjb-2b-01', 'grade-rjb-2b', '数据收集整理', '学习统计方法', 0),
      ('course-rjb-2b-02', 'grade-rjb-2b', '表内除法（一）', '学习除法概念', 1),
      ('course-rjb-2b-03', 'grade-rjb-2b', '图形的运动', '学习平移和旋转', 2),
      ('course-rjb-2b-04', 'grade-rjb-2b', '表内除法（二）', '继续学习除法', 3),
      ('course-rjb-2b-05', 'grade-rjb-2b', '混合运算', '学习运算顺序', 4),
      ('course-rjb-3a-01', 'grade-rjb-3a', '时、分、秒', '认识时间单位', 0),
      ('course-rjb-3a-02', 'grade-rjb-3a', '万以内的加法和减法（一）', '大数加减法', 1),
      ('course-rjb-3a-03', 'grade-rjb-3a', '测量', '认识毫米、分米、千米', 2),
      ('course-rjb-3a-04', 'grade-rjb-3a', '倍的认识', '学习倍数概念', 3),
      ('course-rjb-3a-05', 'grade-rjb-3a', '多位数乘一位数', '学习乘法运算', 4),
      ('course-rjb-3b-01', 'grade-rjb-3b', '位置与方向', '认识八个方向', 0),
      ('course-rjb-3b-02', 'grade-rjb-3b', '除数是一位数的除法', '学习除法运算', 1),
      ('course-rjb-3b-03', 'grade-rjb-3b', '复式统计表', '学习复杂统计', 2),
      ('course-rjb-3b-04', 'grade-rjb-3b', '两位数乘两位数', '学习乘法运算', 3),
      ('course-rjb-3b-05', 'grade-rjb-3b', '面积', '认识面积单位', 4),
      ('course-rjb-4a-01', 'grade-rjb-4a', '大数的认识', '学习大数读写', 0),
      ('course-rjb-4a-02', 'grade-rjb-4a', '公顷和平方千米', '认识面积单位', 1),
      ('course-rjb-4a-03', 'grade-rjb-4a', '角的度量', '学习角的测量', 2),
      ('course-rjb-4a-04', 'grade-rjb-4a', '三位数乘两位数', '学习乘法运算', 3),
      ('course-rjb-4a-05', 'grade-rjb-4a', '平行四边形和梯形', '认识图形', 4),
      ('course-rjb-4b-01', 'grade-rjb-4b', '四则运算', '学习四则混合运算', 0),
      ('course-rjb-4b-02', 'grade-rjb-4b', '运算定律', '学习简便运算', 1),
      ('course-rjb-4b-03', 'grade-rjb-4b', '小数的意义和性质', '学习小数', 2),
      ('course-rjb-4b-04', 'grade-rjb-4b', '小数的加法和减法', '学习小数运算', 3),
      ('course-rjb-4b-05', 'grade-rjb-4b', '图形的运动', '学习对称和平移', 4),
      ('course-rjb-5a-01', 'grade-rjb-5a', '小数乘法', '学习小数乘法', 0),
      ('course-rjb-5a-02', 'grade-rjb-5a', '位置', '学习坐标', 1),
      ('course-rjb-5a-03', 'grade-rjb-5a', '小数除法', '学习小数除法', 2),
      ('course-rjb-5a-04', 'grade-rjb-5a', '可能性', '学习概率', 3),
      ('course-rjb-5a-05', 'grade-rjb-5a', '简易方程', '学习方程', 4),
      ('course-rjb-5b-01', 'grade-rjb-5b', '观察物体', '立体图形观察', 0),
      ('course-rjb-5b-02', 'grade-rjb-5b', '因数和倍数', '学习数论', 1),
      ('course-rjb-5b-03', 'grade-rjb-5b', '长方体和正方体', '认识立体图形', 2),
      ('course-rjb-5b-04', 'grade-rjb-5b', '分数的意义和性质', '学习分数', 3),
      ('course-rjb-5b-05', 'grade-rjb-5b', '图形的运动', '学习旋转', 4),
      ('course-rjb-6a-01', 'grade-rjb-6a', '分数乘法', '学习分数乘法', 0),
      ('course-rjb-6a-02', 'grade-rjb-6a', '位置与方向', '学习方向和距离', 1),
      ('course-rjb-6a-03', 'grade-rjb-6a', '分数除法', '学习分数除法', 2),
      ('course-rjb-6a-04', 'grade-rjb-6a', '比', '学习比的概念', 3),
      ('course-rjb-6a-05', 'grade-rjb-6a', '圆', '认识圆的特性', 4),
      ('course-rjb-6b-01', 'grade-rjb-6b', '负数', '认识负数', 0),
      ('course-rjb-6b-02', 'grade-rjb-6b', '百分数', '学习百分数', 1),
      ('course-rjb-6b-03', 'grade-rjb-6b', '圆柱与圆锥', '认识立体图形', 2),
      ('course-rjb-6b-04', 'grade-rjb-6b', '比例', '学习比例关系', 3),
      ('course-rjb-6b-05', 'grade-rjb-6b', '整理和复习', '总复习', 4)
    `);

    console.log('Database seeded with initial data');
  } else if (coursesEmpty && !subjectsEmpty) {
    sqliteDb.run(`INSERT INTO courses (id, grade_id, title, description, sort_order) VALUES 
      ('course-rjb-1a-01', 'grade-rjb-1a', '数一数', '认识1-10以内的数', 0),
      ('course-rjb-1a-02', 'grade-rjb-1a', '比一比', '学习比较大小、长短、高矮', 1),
      ('course-rjb-1a-03', 'grade-rjb-1a', '1-5的认识和加减法', '认识数字1-5，学习加减法', 2),
      ('course-rjb-1a-04', 'grade-rjb-1a', '认识图形（一）', '认识基本的平面图形', 3),
      ('course-rjb-1a-05', 'grade-rjb-1a', '6-10的认识和加减法', '认识数字6-10，学习加减法', 4),
      ('course-rjb-1b-01', 'grade-rjb-1b', '认识图形（二）', '认识更多的平面图形', 0),
      ('course-rjb-1b-02', 'grade-rjb-1b', '20以内的退位减法', '学习退位减法', 1),
      ('course-rjb-1b-03', 'grade-rjb-1b', '分类与整理', '学习分类方法', 2),
      ('course-rjb-1b-04', 'grade-rjb-1b', '100以内数的认识', '认识100以内的数', 3),
      ('course-rjb-1b-05', 'grade-rjb-1b', '认识人民币', '学习人民币的使用', 4),
      ('course-rjb-2a-01', 'grade-rjb-2a', '长度单位', '认识厘米和米', 0),
      ('course-rjb-2a-02', 'grade-rjb-2a', '100以内的加法和减法（二）', '进位加法和退位减法', 1),
      ('course-rjb-2a-03', 'grade-rjb-2a', '角的初步认识', '认识角的概念', 2),
      ('course-rjb-2a-04', 'grade-rjb-2a', '表内乘法（一）', '学习乘法口诀', 3),
      ('course-rjb-2a-05', 'grade-rjb-2a', '观察物体', '从不同角度观察', 4),
      ('course-rjb-2b-01', 'grade-rjb-2b', '数据收集整理', '学习统计方法', 0),
      ('course-rjb-2b-02', 'grade-rjb-2b', '表内除法（一）', '学习除法概念', 1),
      ('course-rjb-2b-03', 'grade-rjb-2b', '图形的运动', '学习平移和旋转', 2),
      ('course-rjb-2b-04', 'grade-rjb-2b', '表内除法（二）', '继续学习除法', 3),
      ('course-rjb-2b-05', 'grade-rjb-2b', '混合运算', '学习运算顺序', 4),
      ('course-rjb-3a-01', 'grade-rjb-3a', '时、分、秒', '认识时间单位', 0),
      ('course-rjb-3a-02', 'grade-rjb-3a', '万以内的加法和减法（一）', '大数加减法', 1),
      ('course-rjb-3a-03', 'grade-rjb-3a', '测量', '认识毫米、分米、千米', 2),
      ('course-rjb-3a-04', 'grade-rjb-3a', '倍的认识', '学习倍数概念', 3),
      ('course-rjb-3a-05', 'grade-rjb-3a', '多位数乘一位数', '学习乘法运算', 4),
      ('course-rjb-3b-01', 'grade-rjb-3b', '位置与方向', '认识八个方向', 0),
      ('course-rjb-3b-02', 'grade-rjb-3b', '除数是一位数的除法', '学习除法运算', 1),
      ('course-rjb-3b-03', 'grade-rjb-3b', '复式统计表', '学习复杂统计', 2),
      ('course-rjb-3b-04', 'grade-rjb-3b', '两位数乘两位数', '学习乘法运算', 3),
      ('course-rjb-3b-05', 'grade-rjb-3b', '面积', '认识面积单位', 4),
      ('course-rjb-4a-01', 'grade-rjb-4a', '大数的认识', '学习大数读写', 0),
      ('course-rjb-4a-02', 'grade-rjb-4a', '公顷和平方千米', '认识面积单位', 1),
      ('course-rjb-4a-03', 'grade-rjb-4a', '角的度量', '学习角的测量', 2),
      ('course-rjb-4a-04', 'grade-rjb-4a', '三位数乘两位数', '学习乘法运算', 3),
      ('course-rjb-4a-05', 'grade-rjb-4a', '平行四边形和梯形', '认识图形', 4),
      ('course-rjb-4b-01', 'grade-rjb-4b', '四则运算', '学习四则混合运算', 0),
      ('course-rjb-4b-02', 'grade-rjb-4b', '运算定律', '学习简便运算', 1),
      ('course-rjb-4b-03', 'grade-rjb-4b', '小数的意义和性质', '学习小数', 2),
      ('course-rjb-4b-04', 'grade-rjb-4b', '小数的加法和减法', '学习小数运算', 3),
      ('course-rjb-4b-05', 'grade-rjb-4b', '图形的运动', '学习对称和平移', 4),
      ('course-rjb-5a-01', 'grade-rjb-5a', '小数乘法', '学习小数乘法', 0),
      ('course-rjb-5a-02', 'grade-rjb-5a', '位置', '学习坐标', 1),
      ('course-rjb-5a-03', 'grade-rjb-5a', '小数除法', '学习小数除法', 2),
      ('course-rjb-5a-04', 'grade-rjb-5a', '可能性', '学习概率', 3),
      ('course-rjb-5a-05', 'grade-rjb-5a', '简易方程', '学习方程', 4),
      ('course-rjb-5b-01', 'grade-rjb-5b', '观察物体', '立体图形观察', 0),
      ('course-rjb-5b-02', 'grade-rjb-5b', '因数和倍数', '学习数论', 1),
      ('course-rjb-5b-03', 'grade-rjb-5b', '长方体和正方体', '认识立体图形', 2),
      ('course-rjb-5b-04', 'grade-rjb-5b', '分数的意义和性质', '学习分数', 3),
      ('course-rjb-5b-05', 'grade-rjb-5b', '图形的运动', '学习旋转', 4),
      ('course-rjb-6a-01', 'grade-rjb-6a', '分数乘法', '学习分数乘法', 0),
      ('course-rjb-6a-02', 'grade-rjb-6a', '位置与方向', '学习方向和距离', 1),
      ('course-rjb-6a-03', 'grade-rjb-6a', '分数除法', '学习分数除法', 2),
      ('course-rjb-6a-04', 'grade-rjb-6a', '比', '学习比的概念', 3),
      ('course-rjb-6a-05', 'grade-rjb-6a', '圆', '认识圆的特性', 4),
      ('course-rjb-6b-01', 'grade-rjb-6b', '负数', '认识负数', 0),
      ('course-rjb-6b-02', 'grade-rjb-6b', '百分数', '学习百分数', 1),
      ('course-rjb-6b-03', 'grade-rjb-6b', '圆柱与圆锥', '认识立体图形', 2),
      ('course-rjb-6b-04', 'grade-rjb-6b', '比例', '学习比例关系', 3),
      ('course-rjb-6b-05', 'grade-rjb-6b', '整理和复习', '总复习', 4)
    `);

    console.log('Courses seeded successfully');
  }
}

export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

export type Database = ReturnType<typeof drizzle>;
