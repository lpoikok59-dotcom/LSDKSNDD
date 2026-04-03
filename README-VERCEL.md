# 部署到 Vercel 完整指南

## 前置要求

在开始部署前，您需要准备：

1. **GitHub 账户** - 用于存储代码
2. **Vercel 账户** - https://vercel.com (免费注册)
3. **MySQL 数据库** - 可选方案：
   - PlanetScale (免费 MySQL 兼容)
   - AWS RDS
   - DigitalOcean
   - 其他云数据库
4. **AWS S3 账户** - 用于存储图片（可选，也可用其他 CDN）

---

## 第 1 步：准备代码

### 1.1 初始化 Git 仓库

```bash
cd komoreco-clone
git init
git add .
git commit -m "Initial commit: komoreco landing page with admin panel"
```

### 1.2 创建 GitHub 仓库

1. 访问 https://github.com/new
2. 创建新仓库，名称为 `komoreco-clone`
3. 选择 **Public** (如果需要私密可选 Private)
4. **不要** 初始化 README、.gitignore 或 License

### 1.3 推送代码到 GitHub

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/komoreco-clone.git
git push -u origin main
```

---

## 第 2 步：设置数据库

### 选项 A：使用 PlanetScale (推荐，免费)

1. 访问 https://planetscale.com
2. 注册账户
3. 创建新数据库，名称为 `komoreco`
4. 获取连接字符串 (MySQL)
5. 复制 `DATABASE_URL`，格式如：
   ```
   mysql://username:password@aws.connect.psdb.cloud/komoreco?sslaccept=strict
   ```

### 选项 B：使用 AWS RDS

1. 访问 AWS 控制台
2. 创建 MySQL 实例 (免费层可用 db.t2.micro)
3. 配置安全组允许 Vercel IP 访问
4. 获取连接字符串

---

## 第 3 步：设置 S3 存储 (图片上传)

### 3.1 创建 AWS S3 桶

1. 访问 AWS S3 控制台
2. 创建新桶，名称为 `komoreco-images`
3. 关闭"阻止所有公共访问"(因为需要公开访问)
4. 添加桶策略允许公开读取：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::komoreco-images/*"
    }
  ]
}
```

### 3.2 创建 IAM 用户

1. 访问 IAM 控制台
2. 创建新用户 `komoreco-app`
3. 添加权限策略 `AmazonS3FullAccess`
4. 创建访问密钥
5. 记录 `Access Key ID` 和 `Secret Access Key`

---

## 第 4 步：在 Vercel 部署

### 4.1 导入项目

1. 访问 https://vercel.com
2. 点击 **Add New** → **Project**
3. 选择 **Import Git Repository**
4. 授权 GitHub 并选择 `komoreco-clone` 仓库
5. 点击 **Import**

### 4.2 配置环境变量

在 Vercel 项目设置中，添加以下环境变量：

| 变量名 | 值 | 说明 |
|-------|-----|------|
| `DATABASE_URL` | `mysql://...` | PlanetScale 或 RDS 连接字符串 |
| `JWT_SECRET` | 生成随机字符串 | 用 `openssl rand -base64 32` 生成 |
| `AWS_REGION` | `us-east-1` | AWS 区域 |
| `AWS_ACCESS_KEY_ID` | 你的 AWS Key | IAM 用户访问密钥 |
| `AWS_SECRET_ACCESS_KEY` | 你的 AWS Secret | IAM 用户密钥 |
| `AWS_S3_BUCKET` | `komoreco-images` | S3 桶名称 |
| `NODE_ENV` | `production` | 固定值 |

### 4.3 部署

1. 点击 **Deploy**
2. 等待构建完成 (通常 3-5 分钟)
3. 部署成功后，您会获得一个 URL，例如：
   ```
   https://komoreco-clone.vercel.app
   ```

---

## 第 5 步：初始化数据库和管理员

### 5.1 运行数据库迁移

部署完成后，需要初始化数据库表。有两种方式：

**方式 A：使用 Vercel CLI (推荐)**

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 拉取环境变量
vercel env pull

# 运行迁移
DATABASE_URL=你的连接字符串 pnpm drizzle-kit migrate
```

**方式 B：手动执行 SQL**

1. 连接到您的数据库 (使用 MySQL 客户端或 PlanetScale 控制台)
2. 执行 `drizzle/migrations/` 文件夹中的所有 SQL 文件
3. 按顺序执行，确保表创建成功

### 5.2 初始化管理员密码

```bash
# 本地运行
DATABASE_URL=你的连接字符串 node seed-admin.mjs 123456
```

**注意**：密码已通过 `seed-admin.mjs` 脚本自动哈希处理，无需手动插入。

---

## 第 6 步：访问您的应用

- **落地页**：https://your-project.vercel.app
- **后台管理**：https://your-project.vercel.app/admin
  - 密码：`123456` (或您设置的密码)

---

## 常见问题

### Q: 部署失败，显示 "Build failed"

**A:** 检查以下几点：
1. 所有环境变量都已正确设置
2. `package.json` 中的 `build` 脚本正确
3. 检查 Vercel 构建日志获取详细错误信息

### Q: 数据库连接失败

**A:**
1. 确认 `DATABASE_URL` 格式正确
2. 检查数据库防火墙是否允许 Vercel IP
3. 确认数据库用户名和密码正确

### Q: 图片上传失败

**A:**
1. 检查 AWS S3 桶是否存在
2. 确认 IAM 用户有 S3 权限
3. 检查 `AWS_S3_BUCKET` 环境变量是否正确

### Q: 后台登录失败

**A:**
1. 确认已运行 `seed-admin.mjs` 脚本初始化管理员密码
2. 检查数据库中 `admin_auth` 表是否有数据：
   ```sql
   SELECT * FROM admin_auth LIMIT 1;
   ```
3. 确认使用正确的密码登录
4. 检查 Vercel 日志中是否有错误信息

---

## 后续维护

### 更新代码

```bash
# 本地修改代码
git add .
git commit -m "Update: ..."
git push origin main

# Vercel 会自动检测到推送并重新部署
```

### 修改管理员密码

```bash
DATABASE_URL=你的连接字符串 node seed-admin.mjs 新密码
```

### 查看日志

在 Vercel 控制台 → Deployments → 选择部署 → Logs

---

## 性能优化建议

1. **启用 CDN**：Vercel 自动使用全球 CDN
2. **图片优化**：使用 WebP 格式，大小 < 2MB
3. **数据库连接池**：PlanetScale 自动处理
4. **缓存策略**：在 `vercel.json` 中配置

---

## 安全建议

1. **不要提交 .env 文件**到 GitHub
2. **定期轮换密钥**：AWS 访问密钥、JWT Secret
3. **启用 HTTPS**：Vercel 自动提供
4. **设置自定义域名**：在 Vercel 项目设置中配置
5. **启用 Vercel 防火墙**：保护后台管理员接口

---

## 需要帮助？

- Vercel 文档：https://vercel.com/docs
- PlanetScale 文档：https://planetscale.com/docs
- AWS 文档：https://docs.aws.amazon.com
