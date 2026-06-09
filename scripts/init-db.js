#!/usr/bin/env node
/**
 * 数据库初始化脚本
 * 运行: node scripts/init-db.js
 */

const { initDb } = require('./lib/db');

async function main() {
  console.log('正在初始化数据库...');
  try {
    const db = await initDb();
    console.log('✓ 数据库初始化成功！');
    process.exit(0);
  } catch (error) {
    console.error('✗ 数据库初始化失败:', error);
    process.exit(1);
  }
}

main();
