import { EmailVerification } from '@/lib/models/EmailVerification';
import { sendVerificationCode } from '@/lib/email';
import { User } from '@/lib/models/User';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { email, type = 'register' } = req.body;

    if (!email) {
      return res.status(400).json({ error: '请提供邮箱地址' });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }

    // 如果是注册，检查邮箱是否已存在
    if (type === 'register') {
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: '该邮箱已被注册' });
      }
    }

    // 生成验证码
    const code = EmailVerification.generateCode();
    
    // 保存验证码
    await EmailVerification.create(email, code);

    // 发送邮件
    const sent = await sendVerificationCode(email, code);
    
    if (!sent) {
      return res.status(500).json({ error: '发送验证码失败，请稍后重试' });
    }

    return res.status(200).json({ 
      message: '验证码已发送到您的邮箱',
      // 开发环境可以返回验证码，生产环境应该移除
      ...(process.env.NODE_ENV === 'development' && { code })
    });
  } catch (error) {
    console.error('发送验证码错误:', error);
    return res.status(500).json({ error: '服务器错误，请稍后重试' });
  }
}

