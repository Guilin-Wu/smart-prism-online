# 快速开始测试

## 第一步：安装依赖

```bash
npm install
```

## 第二步：配置环境变量

创建 `.env` 文件：

```bash
# 在项目根目录创建 .env 文件
cat > .env << 'EOF'
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smart_prism

# JWT 密钥
JWT_SECRET=dev_secret_key_123456
JWT_EXPIRE=7d

# 邮件配置（可选，如果暂时不需要可以填写任意值）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

**重要**：请将 `your_password` 和 `your_email@gmail.com` 等替换为实际值。

## 第三步：初始化数据库

### 方法 1：使用命令行（推荐）

```bash
mysql -u root -p < lib/db/schema.sql
```

### 方法 2：手动执行

1. 打开 MySQL 客户端
2. 执行 `lib/db/schema.sql` 文件中的所有 SQL 语句

## 第四步：测试数据库连接

```bash
npm run test:db
```

如果看到 "✅ 数据库连接成功！"，说明配置正确。

## 第五步：启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:3000 启动

## 第六步：测试功能

### 1. 访问注册页面
打开浏览器访问：http://localhost:3000/auth/register

### 2. 注册账号
- 填写邮箱、密码
- 点击"发送验证码"
- **注意**：如果邮件配置不正确，验证码发送会失败
- 可以暂时修改代码跳过验证码验证（仅开发环境）

### 3. 登录
访问：http://localhost:3000/auth/login
使用注册的邮箱和密码登录

### 4. 上传数据
- 登录后访问：http://localhost:3000/upload
- 上传一个 Excel 文件（包含学号、姓名、班级、各科成绩等）

### 5. 查看 Dashboard
- 上传成功后会自动跳转到 Dashboard
- 或从首页选择考试进入 Dashboard

## 如果遇到问题

### 数据库连接失败
- 检查 MySQL 服务是否运行：`mysql -u root -p`
- 确认 `.env` 中的数据库配置正确
- 运行 `npm run test:db` 查看详细错误

### 邮件发送失败（注册时）
可以暂时修改 `pages/api/auth/register.js`，在开发环境中跳过验证码验证：

```javascript
// 开发环境跳过验证码验证
if (process.env.NODE_ENV === 'development') {
  // 跳过验证码检查
} else {
  const isValidCode = await EmailVerification.verify(email, verificationCode);
  if (!isValidCode) {
    return res.status(400).json({ error: '验证码无效或已过期' });
  }
}
```

### 端口被占用
如果 3000 端口被占用，Next.js 会自动使用下一个可用端口（如 3001）

## 下一步

测试通过后，可以：
1. 继续迁移其他模块
2. 完善现有功能
3. 准备部署

