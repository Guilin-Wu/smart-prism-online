/**
 * 测试数据库连接
 * 使用方法: node scripts/test-db.js
 */

require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('正在测试数据库连接...');
    console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`Database: ${process.env.DB_NAME}`);

    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    console.log('✅ 数据库连接成功！');

    // 测试查询
    const [tables] = await pool.execute('SHOW TABLES');
    console.log(`\n数据库表数量: ${tables.length}`);
    if (tables.length > 0) {
      console.log('表列表:');
      tables.forEach(table => {
        console.log(`  - ${Object.values(table)[0]}`);
      });
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ 数据库连接失败:');
    console.error(`错误信息: ${error.message}`);
    console.error('\n请检查:');
    console.error('1. MySQL 服务是否运行');
    console.error('2. .env 文件中的数据库配置是否正确');
    console.error('3. 数据库用户是否有足够权限');
    process.exit(1);
  }
}

testConnection();

