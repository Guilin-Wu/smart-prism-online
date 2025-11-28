import nodemailer from 'nodemailer';

// 创建邮件传输器
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 发送验证码邮件
export async function sendVerificationCode(email, code) {
  try {
    const mailOptions = {
      from: `"智慧棱镜系统" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '智慧棱镜系统 - 邮箱验证码',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">智慧棱镜系统</h2>
          <p>您好，</p>
          <p>您的验证码是：</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0;">${code}</h1>
          </div>
          <p>验证码有效期为 5 分钟，请勿泄露给他人。</p>
          <p style="color: #999; font-size: 12px;">如果这不是您的操作，请忽略此邮件。</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('验证码邮件已发送:', info.messageId);
    return true;
  } catch (error) {
    console.error('发送邮件失败:', error);
    return false;
  }
}

// 测试邮件连接
export async function testEmailConnection() {
  try {
    await transporter.verify();
    console.log('邮件服务器连接成功');
    return true;
  } catch (error) {
    console.error('邮件服务器连接失败:', error);
    return false;
  }
}

