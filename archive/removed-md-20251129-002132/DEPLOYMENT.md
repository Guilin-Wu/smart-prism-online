# 部署指南

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件（参考 `.env.example`）：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=smart_prism

# JWT 密钥（生产环境必须修改）
JWT_SECRET=your_very_strong_secret_key_here
JWT_EXPIRE=7d

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# 应用 URL（生产环境）
NEXT_PUBLIC_API_URL=https://smart-prism.online/api
NEXT_PUBLIC_APP_URL=https://smart-prism.online
```

### 3. 初始化数据库

```bash
# 使用 MySQL 客户端
mysql -u your_db_user -p < lib/db/schema.sql

# 或者手动执行 SQL 文件
```

### 4. 运行开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 生产环境部署

### 方式一：使用 PM2

```bash
# 安装 PM2
npm install -g pm2

# 构建应用
npm run build

# 启动应用
pm2 start npm --name "smart-prism" -- start

# 保存配置
pm2 save

# 设置开机自启
pm2 startup
```

### 方式二：使用 Docker

创建 `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

构建和运行：

```bash
docker build -t smart-prism .
docker run -p 3000:3000 --env-file .env smart-prism
```

### 方式三：使用 Vercel（推荐）

1. 将代码推送到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量
4. 部署

注意：Vercel 需要配置 MySQL 数据库连接（可以使用 Vercel 的数据库服务或外部 MySQL）。

## 域名配置

### 1. 配置 DNS

将域名 `smart-prism.online` 的 A 记录指向服务器 IP，或使用 CNAME 指向 Vercel/其他平台。

### 2. 配置 SSL 证书

使用 Let's Encrypt 或其他 SSL 证书服务：

```bash
# 使用 certbot
sudo certbot --nginx -d smart-prism.online
```

### 3. 配置 Nginx（如果使用自己的服务器）

```nginx
server {
    listen 80;
    server_name smart-prism.online;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name smart-prism.online;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 数据库迁移

如果需要更新数据库结构，可以：

1. 创建迁移 SQL 文件
2. 在服务器上执行迁移
3. 备份数据库

```bash
# 备份
mysqldump -u user -p smart_prism > backup.sql

# 执行迁移
mysql -u user -p smart_prism < migration.sql
```

## 监控和维护

### 日志查看

```bash
# PM2 日志
pm2 logs smart-prism

# 系统日志
journalctl -u smart-prism
```

### 性能监控

- 使用 PM2 监控：`pm2 monit`
- 使用 Next.js 内置监控
- 配置外部监控服务（如 Sentry）

## 安全建议

1. **环境变量**: 不要在代码中硬编码敏感信息
2. **JWT Secret**: 使用强随机字符串
3. **HTTPS**: 生产环境必须使用 HTTPS
4. **数据库**: 限制数据库访问 IP，使用强密码
5. **CORS**: 配置适当的 CORS 策略
6. **Rate Limiting**: 添加 API 速率限制
7. **输入验证**: 验证所有用户输入
8. **SQL 注入**: 使用参数化查询（已实现）

## 故障排查

### 数据库连接失败

- 检查数据库服务是否运行
- 验证环境变量配置
- 检查防火墙设置
- 验证数据库用户权限

### 邮件发送失败

- 检查 SMTP 配置
- Gmail 需要使用应用专用密码
- 检查邮件服务器端口是否开放

### 文件上传失败

- 检查文件大小限制
- 验证文件格式
- 检查服务器磁盘空间

## 备份策略

1. **数据库备份**: 每日自动备份
2. **代码备份**: 使用 Git 版本控制
3. **环境变量备份**: 安全存储 `.env` 文件

```bash
# 自动备份脚本示例
#!/bin/bash
DATE=$(date +%Y%m%d)
mysqldump -u user -p smart_prism > /backup/db_$DATE.sql
```

