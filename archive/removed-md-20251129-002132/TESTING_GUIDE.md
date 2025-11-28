# 测试指南

## 前置准备

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件（如果还没有）：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写以下配置：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=smart_prism

# JWT 密钥（开发环境可以使用简单密钥，生产环境必须使用强密钥）
JWT_SECRET=dev_secret_key_change_in_production
JWT_EXPIRE=7d

# 邮件配置（用于发送验证码）
# 如果暂时不需要邮件功能，可以填写任意值，但注册功能会受影响
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. 初始化数据库

#### 方式一：使用 MySQL 命令行

```bash
mysql -u your_db_user -p < lib/db/schema.sql
```

#### 方式二：手动执行 SQL

1. 打开 MySQL 客户端（如 MySQL Workbench、phpMyAdmin 等）
2. 执行 `lib/db/schema.sql` 文件中的所有 SQL 语句

#### 方式三：使用 MySQL Workbench

1. 打开 MySQL Workbench
2. 连接到数据库服务器
3. File -> Open SQL Script -> 选择 `lib/db/schema.sql`
4. 执行脚本

### 4. 验证数据库连接

可以创建一个简单的测试脚本来验证数据库连接：

```bash
node -e "
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
pool.getConnection().then(() => {
  console.log('✅ 数据库连接成功');
  process.exit(0);
}).catch(err => {
  console.error('❌ 数据库连接失败:', err.message);
  process.exit(1);
});
"
```

## 启动应用

### 开发模式

```bash
npm run dev
```

应用将在 http://localhost:3000 启动

### 生产模式（测试）

```bash
npm run build
npm start
```

## 测试步骤

### 1. 测试用户注册

1. 访问 http://localhost:3000/auth/register
2. 填写邮箱、密码、姓名（可选）
3. 点击"发送验证码"
4. 检查邮箱（或开发环境控制台，可能会显示验证码）
5. 输入验证码并注册

**注意**：如果邮件配置不正确，注册功能会失败。可以：
- 配置正确的 SMTP 设置
- 或者在开发环境中修改代码，暂时跳过验证码验证

### 2. 测试用户登录

1. 访问 http://localhost:3000/auth/login
2. 使用注册的邮箱和密码登录
3. 应该成功跳转到首页

### 3. 测试数据上传

1. 登录后，访问 http://localhost:3000/upload
2. 准备一个 Excel 文件（.xlsx 或 .xls 格式）
   - 应包含列：学号、姓名、班级、各科成绩、总分、排名
   - 或英文列名：student_id, name, class, subject scores, total_score, rank
3. 选择文件并上传
4. 上传成功后应该跳转到 Dashboard

### 4. 测试 Dashboard

1. 从首页选择一个考试，或访问 `/dashboard?examId=1`
2. 检查以下内容：
   - KPI 卡片显示正确的数据
   - 统计表显示各科统计数据
   - 图表正常渲染（箱形图、雷达图等）

### 5. 测试 API

#### 测试认证 API

```bash
# 注册
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "123456",
    "name": "测试用户",
    "verificationCode": "123456"
  }'

# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "123456"
  }'

# 获取当前用户
curl http://localhost:3000/api/auth/me \
  -H "Cookie: token=YOUR_TOKEN"
```

#### 测试考试数据 API

```bash
# 获取考试列表
curl http://localhost:3000/api/exams \
  -H "Cookie: token=YOUR_TOKEN"

# 获取考试数据
curl http://localhost:3000/api/exams/1/data \
  -H "Cookie: token=YOUR_TOKEN"

# 获取统计数据
curl http://localhost:3000/api/exams/1/statistics \
  -H "Cookie: token=YOUR_TOKEN"
```

## 常见问题排查

### 1. 数据库连接失败

**错误**：`Error: connect ECONNREFUSED` 或 `Access denied`

**解决方案**：
- 检查 MySQL 服务是否运行：`mysql -u root -p`
- 验证 `.env` 中的数据库配置
- 确认数据库用户有足够权限
- 检查防火墙设置

### 2. 邮件发送失败

**错误**：`Error: Invalid login` 或 `Authentication failed`

**解决方案**：
- Gmail 需要使用"应用专用密码"，不是普通密码
- 检查 SMTP 配置是否正确
- 如果暂时不需要邮件功能，可以修改注册 API 跳过验证码验证（仅开发环境）

### 3. 文件上传失败

**错误**：`Error: ENOENT` 或 `formidable` 相关错误

**解决方案**：
- 确认已安装 `formidable`：`npm install formidable`
- 检查文件大小限制
- 确认文件格式正确（.xlsx 或 .xls）

### 4. 页面显示空白

**可能原因**：
- JavaScript 错误（检查浏览器控制台）
- API 请求失败（检查网络请求）
- 数据库数据为空

**解决方案**：
- 打开浏览器开发者工具（F12）
- 查看 Console 标签的错误信息
- 查看 Network 标签的请求状态

### 5. 图表不显示

**可能原因**：
- ECharts 未正确加载
- 数据格式不正确

**解决方案**：
- 检查浏览器控制台是否有错误
- 确认数据已正确加载
- 检查 `echarts-for-react` 是否正确安装

## 测试检查清单

- [ ] 用户注册功能
- [ ] 用户登录功能
- [ ] 数据上传功能
- [ ] Dashboard 页面显示
- [ ] KPI 卡片数据正确
- [ ] 统计表数据正确
- [ ] 图表正常渲染
- [ ] 班级筛选功能（如果实现）
- [ ] 响应式设计（移动端测试）
- [ ] API 接口正常响应

## 下一步

测试通过后，可以：
1. 继续迁移其他模块（Student、Paper 等）
2. 完善 Dashboard 功能
3. 添加更多图表类型
4. 优化用户体验
5. 准备部署到生产环境

