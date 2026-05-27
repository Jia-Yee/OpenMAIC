import { initDb, getDb } from './index';
import { subjects, textbooks, grades, courses } from './schema';
import { eq } from 'drizzle-orm';

const SEED_DATA = {
  subjects: [
    { id: 'subject-math', name: '数学', code: 'math', description: '数学思维训练课程', sortOrder: 0 },
    { id: 'subject-chinese', name: '语文', code: 'chinese', description: '语文阅读与写作课程', sortOrder: 1 },
    { id: 'subject-english', name: '英语', code: 'english', description: '英语听说读写训练', sortOrder: 2 },
  ],
  textbooks: [
    { id: 'textbook-math-rjb', subjectId: 'subject-math', name: '人教版', publisher: '人民教育出版社', gradeRange: '1-6年级', sortOrder: 0 },
    { id: 'textbook-math-bsdb', subjectId: 'subject-math', name: '北师大版', publisher: '北京师范大学出版社', gradeRange: '1-6年级', sortOrder: 1 },
    { id: 'textbook-math-sjb', subjectId: 'subject-math', name: '苏教版', publisher: '江苏教育出版社', gradeRange: '1-6年级', sortOrder: 2 },
  ],
  grades: [
    // 人教版
    { id: 'grade-rjb-1a', textbookId: 'textbook-math-rjb', name: '一年级上册', price: 199, sortOrder: 0 },
    { id: 'grade-rjb-1b', textbookId: 'textbook-math-rjb', name: '一年级下册', price: 199, sortOrder: 1 },
    { id: 'grade-rjb-2a', textbookId: 'textbook-math-rjb', name: '二年级上册', price: 199, sortOrder: 2 },
    { id: 'grade-rjb-2b', textbookId: 'textbook-math-rjb', name: '二年级下册', price: 199, sortOrder: 3 },
    { id: 'grade-rjb-3a', textbookId: 'textbook-math-rjb', name: '三年级上册', price: 249, sortOrder: 4 },
    { id: 'grade-rjb-3b', textbookId: 'textbook-math-rjb', name: '三年级下册', price: 249, sortOrder: 5 },
  ],
  courses: [
    // 一年级上册
    { id: 'course-rjb-1a-01', gradeId: 'grade-rjb-1a', title: '数一数', description: '认识1-10以内的数', sortOrder: 0 },
    { id: 'course-rjb-1a-02', gradeId: 'grade-rjb-1a', title: '比一比', description: '学习比较大小、长短、高矮', sortOrder: 1 },
    { id: 'course-rjb-1a-03', gradeId: 'grade-rjb-1a', title: '1-5的认识和加减法', description: '认识数字1-5，学习加减法', sortOrder: 2 },
    { id: 'course-rjb-1a-04', gradeId: 'grade-rjb-1a', title: '认识图形（一）', description: '认识基本的平面图形', sortOrder: 3 },
    { id: 'course-rjb-1a-05', gradeId: 'grade-rjb-1a', title: '6-10的认识和加减法', description: '认识数字6-10，学习加减法', sortOrder: 4 },
  ],
};

export async function seedDatabase() {
  const db = getDb();

  // Seed subjects
  for (const subject of SEED_DATA.subjects) {
    await db.insert(subjects).values(subject).onConflictDoNothing();
  }

  // Seed textbooks
  for (const textbook of SEED_DATA.textbooks) {
    await db.insert(textbooks).values(textbook).onConflictDoNothing();
  }

  // Seed grades
  for (const grade of SEED_DATA.grades) {
    await db.insert(grades).values(grade).onConflictDoNothing();
  }

  // Seed courses
  for (const course of SEED_DATA.courses) {
    await db.insert(courses).values(course).onConflictDoNothing();
  }

  console.log('Database seeded successfully');
}

// Run on import in development
if (process.env.NODE_ENV !== 'test') {
  initDb().then(() => {
    seedDatabase().catch(console.error);
  }).catch(console.error);
}
