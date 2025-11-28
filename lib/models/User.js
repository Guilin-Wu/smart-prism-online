import { query } from '../db';
import bcrypt from 'bcryptjs';

export class User {
  // 根据邮箱查找用户
  static async findByEmail(email) {
    const results = await query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return results[0] || null;
  }

  // 根据ID查找用户
  static async findById(id) {
    const results = await query(
      'SELECT id, email, name, created_at, last_login_at FROM users WHERE id = ?',
      [id]
    );
    return results[0] || null;
  }

  // 创建用户
  static async create(email, password, name = null) {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
      [email, passwordHash, name || email.split('@')[0]]
    );
    return result.insertId;
  }

  // 验证密码
  static async verifyPassword(email, password) {
    const user = await this.findByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return null;
    
    // 更新最后登录时间
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    );
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  // 更新用户信息
  static async update(id, data) {
    const fields = [];
    const values = [];
    
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    
    if (data.password !== undefined) {
      const passwordHash = await bcrypt.hash(data.password, 10);
      fields.push('password_hash = ?');
      values.push(passwordHash);
    }
    
    if (fields.length === 0) return null;
    
    values.push(id);
    await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return await this.findById(id);
  }
}

