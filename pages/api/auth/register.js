import { User } from '@/lib/models/User';
import { EmailVerification } from '@/lib/models/EmailVerification';
import { sendVerificationCode } from '@/lib/email';
import { generateToken } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { email, password, name, verificationCode } = req.body;

    // 验证输入
    if (!email || !password || !verificationCode) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }

    // 验证密码长度
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少为6位' });
    }

    // 验证验证码
    const isValidCode = await EmailVerification.verify(email, verificationCode);
    if (!isValidCode) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }

    // 检查用户是否已存在
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }

    // 创建用户
    const userId = await User.create(email, password, name);
    const user = await User.findById(userId);

    // 生成 Token
    const token = generateToken(user);

    // 设置 Cookie
    res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`);

    return res.status(201).json({
      message: '注册成功',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    console.error('注册错误:', error);
    return res.status(500).json({ error: '服务器错误，请稍后重试' });
  }
}

