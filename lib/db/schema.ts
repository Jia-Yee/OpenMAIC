import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  unique,
} from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ==================== 用户相关 ====================

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  openid: text('openid').notNull().unique(),
  unionid: text('unionid'),
  nickname: text('nickname'),
  avatarUrl: text('avatar_url'),
  phone: text('phone'),
  password: text('password'),
  isAdmin: integer('is_admin', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
}, (table) => ({
  openidIdx: index('users_openid_idx').on(table.openid),
  phoneIdx: index('users_phone_idx').on(table.phone),
}));

export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

// ==================== 课程相关 ====================

export const subjects = sqliteTable('subjects', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  code: text('code').unique(),
  description: text('description'),
  iconUrl: text('icon_url'),
  sortOrder: integer('sort_order').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
}, (table) => ({
  codeIdx: index('subjects_code_idx').on(table.code),
}));

export const subjectsRelations = relations(subjects, ({ many }) => ({
  textbooks: many(textbooks),
}));

export const textbooks = sqliteTable('textbooks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  publisher: text('publisher'),
  gradeRange: text('grade_range'),
  description: text('description'),
  coverUrl: text('cover_url'),
  sortOrder: integer('sort_order').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
}, (table) => ({
  subjectIdx: index('textbooks_subject_idx').on(table.subjectId),
}));

export const textbooksRelations = relations(textbooks, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [textbooks.subjectId],
    references: [subjects.id],
  }),
  grades: many(grades),
}));

export const grades = sqliteTable('grades', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  textbookId: text('textbook_id').notNull().references(() => textbooks.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code'),
  description: text('description'),
  coverUrl: text('cover_url'),
  price: real('price').default(0),
  originalPrice: real('original_price'),
  sortOrder: integer('sort_order').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
}, (table) => ({
  textbookIdx: index('grades_textbook_idx').on(table.textbookId),
}));

export const gradesRelations = relations(grades, ({ one, many }) => ({
  textbook: one(textbooks, {
    fields: [grades.textbookId],
    references: [textbooks.id],
  }),
  courses: many(courses),
}));

export const courses = sqliteTable('courses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  gradeId: text('grade_id').notNull().references(() => grades.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  coverUrl: text('cover_url'),
  videoUrl: text('video_url'),
  classroomId: text('classroom_id'),
  duration: integer('duration'),
  sortOrder: integer('sort_order').default(0),
  semester: text('semester').default('full'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  isFree: integer('is_free', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  gradeIdx: index('courses_grade_idx').on(table.gradeId),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  grade: one(grades, {
    fields: [courses.gradeId],
    references: [grades.id],
  }),
  prerequisites: many(coursePrerequisites),
}));

export const coursePrerequisites = sqliteTable('course_prerequisites', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  prerequisiteId: text('prerequisite_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  courseIdx: index('course_prerequisites_course_idx').on(table.courseId),
  prerequisiteIdx: index('course_prerequisites_prerequisite_idx').on(table.prerequisiteId),
  uniqueConstraint: unique('course_prerequisites_unique').on(table.courseId, table.prerequisiteId),
}));

export const coursePrerequisitesRelations = relations(coursePrerequisites, ({ one }) => ({
  course: one(courses, {
    fields: [coursePrerequisites.courseId],
    references: [courses.id],
  }),
  prerequisite: one(courses, {
    fields: [coursePrerequisites.prerequisiteId],
    references: [courses.id],
  }),
}));

// ==================== 用户年级权限 ====================

export const userGrades = sqliteTable('user_grades', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  gradeId: text('grade_id').notNull().references(() => grades.id, { onDelete: 'cascade' }),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  userIdx: index('user_grades_user_idx').on(table.userId),
  gradeIdx: index('user_grades_grade_idx').on(table.gradeId),
  userGradeIdx: index('user_grades_user_grade_idx').on(table.userId, table.gradeId),
}));

export const userGradesRelations = relations(userGrades, ({ one }) => ({
  user: one(users, {
    fields: [userGrades.userId],
    references: [users.id],
  }),
  grade: one(grades, {
    fields: [userGrades.gradeId],
    references: [grades.id],
  }),
}));

// ==================== 订阅相关 ====================

export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  gradeId: text('grade_id').notNull().references(() => grades.id, { onDelete: 'cascade' }),
  orderNo: text('order_no').notNull().unique(),
  tradeNo: text('trade_no'),
  amount: real('amount').notNull(),
  status: text('status').default('pending').notNull(), // pending/paid/expired/refunded
  paidAt: integer('paid_at', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  userIdx: index('subscriptions_user_idx').on(table.userId),
  gradeIdx: index('subscriptions_grade_idx').on(table.gradeId),
  orderNoIdx: index('subscriptions_order_no_idx').on(table.orderNo),
  statusIdx: index('subscriptions_status_idx').on(table.status),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  grade: one(grades, {
    fields: [subscriptions.gradeId],
    references: [grades.id],
  }),
}));

// ==================== 学习进度相关 ====================

export const learningProgress = sqliteTable('learning_progress', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  progress: integer('progress').default(0), // 0-100
  completed: integer('completed', { mode: 'boolean' }).default(false),
  stars: integer('stars').default(0), // 0-3
  lastAccessAt: integer('last_access_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  userIdx: index('learning_progress_user_idx').on(table.userId),
  courseIdx: index('learning_progress_course_idx').on(table.courseId),
  userCourseIdx: index('learning_progress_user_course_idx').on(table.userId, table.courseId),
}));

export const learningProgressRelations = relations(learningProgress, ({ one }) => ({
  user: one(users, {
    fields: [learningProgress.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [learningProgress.courseId],
    references: [courses.id],
  }),
}));

// ==================== 微信登录相关 ====================

export const wechatSessions = sqliteTable('wechat_sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionKey: text('session_key').notNull().unique(),
  openid: text('openid'),
  status: text('status').default('pending').notNull(), // pending/scanned/confirmed/expired
  qrCodeUrl: text('qr_code_url'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  confirmedAt: integer('confirmed_at', { mode: 'timestamp' }),
}, (table) => ({
  sessionKeyIdx: index('wechat_sessions_session_key_idx').on(table.sessionKey),
  statusIdx: index('wechat_sessions_status_idx').on(table.status),
}));

// ==================== 类型导出 ====================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type Textbook = typeof textbooks.$inferSelect;
export type Grade = typeof grades.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type UserGrade = typeof userGrades.$inferSelect;
export type NewUserGrade = typeof userGrades.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type WechatSession = typeof wechatSessions.$inferSelect;
export type NewWechatSession = typeof wechatSessions.$inferInsert;
