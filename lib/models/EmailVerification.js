import { query } from '../db';

export class EmailVerification {
  // 生成验证码
  static generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // 创建验证码记录
  static async create(email, code) {
    // 设置5分钟过期
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    // 删除该邮箱的旧验证码
    await query(
      'DELETE FROM email_verifications WHERE email = ?',
      [email]
    );
    
    // 插入新验证码
    await query(
      'INSERT INTO email_verifications (email, code, expires_at) VALUES (?, ?, ?)',
      [email, code, expiresAt]
    );
    
    return code;
  }

  // 验证验证码
  static async verify(email, code) {
    const results = await query(
      'SELECT * FROM email_verifications WHERE email = ? AND code = ? AND used = FALSE AND expires_at > NOW()',
      [email, code]
    );
    
    if (results.length === 0) {
      return false;
    }
    
    // 标记为已使用
    await query(
      'UPDATE email_verifications SET used = TRUE WHERE email = ? AND code = ?',
      [email, code]
    );
    
    return true;
  }

  // 清理过期验证码
  static async cleanExpired() {
    await query(
      'DELETE FROM email_verifications WHERE expires_at < NOW() OR used = TRUE',
      []
    );
  }
}

