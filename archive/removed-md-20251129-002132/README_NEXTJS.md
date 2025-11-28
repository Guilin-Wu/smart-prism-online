# 智慧棱镜系统 - Next.js 版本

这是一个基于 Next.js 的前后端分离应用，使用 MySQL 数据库存储数据，支持邮箱注册和登录。

## 功能特性

- ✅ 用户认证（邮箱注册/登录）
- ✅ 考试数据上传（Excel 文件）
- ✅ MySQL 数据库存储
- ✅ JWT Token 认证
- ✅ 邮箱验证码

## 技术栈

- **前端**: Next.js 14, React 18
- **后端**: Next.js API Routes
- **数据库**: MySQL
- **认证**: JWT + bcrypt
- **文件处理**: XLSX, formidable

## 安装步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=smart_prism

# JWT 密钥（生产环境请使用强密钥）
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRE=7d

# 邮件配置（用于发送验证码）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. 创建数据库

使用 MySQL 客户端执行 `lib/db/schema.sql` 创建数据库和表：

```bash
mysql -u your_db_user -p < lib/db/schema.sql
```

或者手动执行 SQL 文件中的语句。

### 4. 运行开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 部署到生产环境

### 1. 构建应用

```bash
npm run build
```

### 2. 启动生产服务器

```bash
npm start
```

### 3. 配置域名

在 `.env` 中更新：

```env
NEXT_PUBLIC_API_URL=https://smart-prism.online/api
NEXT_PUBLIC_APP_URL=https://smart-prism.online
```

### 4. 使用 PM2 管理进程（推荐）

```bash
npm install -g pm2
pm2 start npm --name "smart-prism" -- start
pm2 save
pm2 startup
```

## 项目结构

```
├── pages/
│   ├── api/              # API 路由
│   │   ├── auth/         # 认证相关 API
│   │   └── exams/        # 考试数据 API
│   ├── auth/             # 认证页面
│   │   ├── login.jsx     # 登录页
│   │   └── register.jsx  # 注册页
│   ├── index.jsx         # 首页
│   └── upload.jsx        # 数据上传页
├── lib/
│   ├── db.js             # 数据库连接
│   ├── auth.js           # 认证工具
│   ├── email.js          # 邮件发送
│   └── models/           # 数据模型
├── styles/               # 全局样式
└── public/               # 静态资源
```

## API 端点

### 认证

- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 退出登录
- `GET /api/auth/me` - 获取当前用户信息
- `POST /api/auth/verification-code` - 发送验证码

### 考试数据

- `GET /api/exams` - 获取考试列表
- `POST /api/exams` - 创建考试
- `GET /api/exams/[id]/data` - 获取考试数据
- `POST /api/exams/upload` - 上传 Excel 文件

## 数据库表结构

- `users` - 用户表
- `email_verifications` - 邮箱验证码表
- `exams` - 考试表
- `students` - 学生数据表
- `subject_scores` - 科目成绩表
- `exam_statistics` - 统计数据表
- `ai_chat_history` - AI 对话历史表
- `goal_settings` - 目标设定表
- `comment_templates` - 评语模板表

## 注意事项

1. **生产环境安全**:
   - 修改 `JWT_SECRET` 为强随机字符串
   - 使用 HTTPS
   - 配置 CORS 策略
   - 定期更新依赖包

2. **邮件配置**:
   - Gmail 需要使用应用专用密码
   - 其他邮件服务商请参考相应配置

3. **数据库备份**:
   - 定期备份 MySQL 数据库
   - 建议使用自动化备份工具

## 后续开发

- [ ] 迁移前端组件到 Next.js
- [ ] 实现数据看板页面
- [ ] 实现各种分析模块
- [ ] 添加数据导出功能
- [ ] 优化性能和用户体验

