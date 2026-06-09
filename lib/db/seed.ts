import { initDb, getDb } from './index';
import { subjects, textbooks, grades, courses, eq } from './schema';

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
    
    // 一年级下册
    { id: 'course-rjb-1b-01', gradeId: 'grade-rjb-1b', title: '认识图形（二）', description: '认识更多的平面图形', sortOrder: 0 },
    { id: 'course-rjb-1b-02', gradeId: 'grade-rjb-1b', title: '20以内的退位减法', description: '学习退位减法', sortOrder: 1 },
    { id: 'course-rjb-1b-03', gradeId: 'grade-rjb-1b', title: '分类与整理', description: '学习分类方法', sortOrder: 2 },
    { id: 'course-rjb-1b-04', gradeId: 'grade-rjb-1b', title: '100以内数的认识', description: '认识100以内的数', sortOrder: 3 },
    { id: 'course-rjb-1b-05', gradeId: 'grade-rjb-1b', title: '认识人民币', description: '学习人民币的使用', sortOrder: 4 },
    
    // 二年级上册
    { id: 'course-rjb-2a-01', gradeId: 'grade-rjb-2a', title: '长度单位', description: '认识厘米和米', sortOrder: 0 },
    { id: 'course-rjb-2a-02', gradeId: 'grade-rjb-2a', title: '100以内的加法和减法（二）', description: '进位加法和退位减法', sortOrder: 1 },
    { id: 'course-rjb-2a-03', gradeId: 'grade-rjb-2a', title: '角的初步认识', description: '认识角的概念', sortOrder: 2 },
    { id: 'course-rjb-2a-04', gradeId: 'grade-rjb-2a', title: '表内乘法（一）', description: '学习乘法口诀', sortOrder: 3 },
    { id: 'course-rjb-2a-05', gradeId: 'grade-rjb-2a', title: '观察物体', description: '从不同角度观察', sortOrder: 4 },
    
    // 二年级下册
    { id: 'course-rjb-2b-01', gradeId: 'grade-rjb-2b', title: '数据收集整理', description: '学习统计方法', sortOrder: 0 },
    { id: 'course-rjb-2b-02', gradeId: 'grade-rjb-2b', title: '表内除法（一）', description: '学习除法概念', sortOrder: 1 },
    { id: 'course-rjb-2b-03', gradeId: 'grade-rjb-2b', title: '图形的运动', description: '学习平移和旋转', sortOrder: 2 },
    { id: 'course-rjb-2b-04', gradeId: 'grade-rjb-2b', title: '表内除法（二）', description: '继续学习除法', sortOrder: 3 },
    { id: 'course-rjb-2b-05', gradeId: 'grade-rjb-2b', title: '混合运算', description: '学习运算顺序', sortOrder: 4 },
    
    // 三年级上册
    { id: 'course-rjb-3a-01', gradeId: 'grade-rjb-3a', title: '时、分、秒', description: '认识时间单位', sortOrder: 0 },
    { id: 'course-rjb-3a-02', gradeId: 'grade-rjb-3a', title: '万以内的加法和减法（一）', description: '大数加减法', sortOrder: 1 },
    { id: 'course-rjb-3a-03', gradeId: 'grade-rjb-3a', title: '测量', description: '认识毫米、分米、千米', sortOrder: 2 },
    { id: 'course-rjb-3a-04', gradeId: 'grade-rjb-3a', title: '倍的认识', description: '学习倍数概念', sortOrder: 3 },
    { id: 'course-rjb-3a-05', gradeId: 'grade-rjb-3a', title: '多位数乘一位数', description: '学习乘法运算', sortOrder: 4 },
    
    // 三年级下册
    { id: 'course-rjb-3b-01', gradeId: 'grade-rjb-3b', title: '位置与方向', description: '认识八个方向', sortOrder: 0 },
    { id: 'course-rjb-3b-02', gradeId: 'grade-rjb-3b', title: '除数是一位数的除法', description: '学习除法运算', sortOrder: 1 },
    { id: 'course-rjb-3b-03', gradeId: 'grade-rjb-3b', title: '复式统计表', description: '学习复杂统计', sortOrder: 2 },
    { id: 'course-rjb-3b-04', gradeId: 'grade-rjb-3b', title: '两位数乘两位数', description: '学习乘法运算', sortOrder: 3 },
    { id: 'course-rjb-3b-05', gradeId: 'grade-rjb-3b', title: '面积', description: '认识面积单位', sortOrder: 4 },
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
