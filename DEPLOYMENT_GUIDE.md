# 部署指南 - 獨立服務器部署

本指南說明如何將霸王養精蓄力丹落地頁系統部署到國外服務器（AWS、Vercel、Railway、Render 等），完全獨立於 Manus 平台。

---

## 前置準備

### 1. 環境要求
- **Node.js**: 18+ 版本
- **資料庫**: MySQL 8.0+ 或 TiDB（相容 MySQL）
- **S3 相容儲存**: AWS S3、MinIO、Cloudflare R2 等

### 2. 取得代碼
從 Manus 平台導出代碼：
1. 進入 Management UI → More (⋯) → Download as ZIP
2. 解壓縮到本地

或使用 GitHub 導出（需在 Manus 平台設置 GitHub 連接）

---

## 部署步驟

### 步驟 1: 設置資料庫

#### 本地開發（使用 MySQL）
```bash
# 安裝 MySQL
brew install mysql  # macOS
# 或 apt-get install mysql-server  # Linux

# 啟動 MySQL
mysql.server start

# 創建資料庫
mysql -u root -p
CREATE DATABASE komoreco_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'komoreco_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON komoreco_db.* TO 'komoreco_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 雲端資料庫（推薦用於生產環境）
- **AWS RDS MySQL**: https://aws.amazon.com/rds/mysql/
- **PlanetScale** (MySQL 相容): https://planetscale.com
- **Railway MySQL**: https://railway.app
- **Render PostgreSQL**: https://render.com

選擇任一服務，記錄連接字符串（格式: `mysql://user:password@host:port/database`）

### 步驟 2: 設置 S3 儲存

#### 使用 AWS S3
```bash
# 1. 創建 S3 bucket
# 進入 AWS Console → S3 → Create bucket
# 名稱: komoreco-images-bucket
# 區域: 選擇靠近用戶的區域

# 2. 創建 IAM 用戶
# IAM → Users → Create user
# 權限: AmazonS3FullAccess

# 3. 生成訪問密鑰
# Users → Your User → Security credentials → Create access key
# 記錄: Access Key ID 和 Secret Access Key
```

#### 使用其他 S3 相容服務
- **Cloudflare R2**: https://www.cloudflare.com/products/r2/
- **MinIO** (自託管): https://min.io
- **DigitalOcean Spaces**: https://www.digitalocean.com/products/spaces/

### 步驟 3: 本地開發設置

```bash
# 1. 安裝依賴
pnpm install

# 2. 創建 .env.local 文件
cat > .env.local << 'EOF'
# 資料庫
DATABASE_URL=mysql://komoreco_user:your_secure_password@localhost:3306/komoreco_db

# S3 儲存配置
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET=komoreco-images-bucket
AWS_S3_ENDPOINT=https://s3.amazonaws.com  # 如果使用其他服務，改為相應端點

# JWT 密鑰（生成安全隨機值）
JWT_SECRET=your_random_jwt_secret_key_min_32_chars

# 管理員密碼（首次部署時設置）
ADMIN_PASSWORD=123456
EOF

# 3. 初始化資料庫
pnpm drizzle-kit migrate

# 4. 設置管理員密碼
node seed-admin.mjs 123456

# 5. 啟動開發服務器
pnpm dev

# 訪問: http://localhost:3000
# 後台: http://localhost:3000/admin (密碼: 123456)
```

---

## 部署到雲端服務

### 選項 A: 使用 Vercel（推薦用於前端）

```bash
# 1. 安裝 Vercel CLI
npm i -g vercel

# 2. 登錄 Vercel
vercel login

# 3. 部署
vercel --prod

# 4. 設置環境變數
# 進入 Vercel Dashboard → Settings → Environment Variables
# 添加所有 .env.local 中的變數

# 5. 配置資料庫連接
# 使用 PlanetScale 或 AWS RDS，確保允許 Vercel IP 訪問
```

### 選項 B: 使用 Railway（全棧應用）

```bash
# 1. 進入 https://railway.app
# 2. 創建新項目 → GitHub repo
# 3. 添加 MySQL 服務
#    Railway Dashboard → Add Service → MySQL
# 4. 設置環境變數
#    Railway Dashboard → Variables
#    添加: DATABASE_URL, AWS_*, JWT_SECRET 等
# 5. 部署
#    連接 GitHub repo，自動部署
```

### 選項 C: 使用 Render

```bash
# 1. 進入 https://render.com
# 2. 創建新 Web Service
#    Connect GitHub → Select repo
# 3. 配置
#    - Runtime: Node
#    - Build Command: pnpm install && pnpm build
#    - Start Command: pnpm start
# 4. 添加環境變數
#    Environment → Add Environment Variable
# 5. 添加 PostgreSQL 資料庫
#    Database → Create PostgreSQL
#    更新 DATABASE_URL
```

### 選項 D: 使用 AWS EC2（完全控制）

```bash
# 1. 啟動 EC2 實例
#    - AMI: Ubuntu 22.04 LTS
#    - 實例類型: t3.medium 或更高
#    - 安全組: 開放 80, 443, 3000 端口

# 2. SSH 連接到實例
ssh -i your-key.pem ubuntu@your-instance-ip

# 3. 安裝依賴
sudo apt update
sudo apt install -y nodejs npm mysql-client git
sudo npm install -g pnpm

# 4. 克隆代碼
git clone https://github.com/your-repo/komoreco-clone.git
cd komoreco-clone

# 5. 設置環境變數
nano .env.production

# 6. 安裝和構建
pnpm install
pnpm build

# 7. 使用 PM2 管理進程
sudo npm install -g pm2
pm2 start "pnpm start" --name komoreco
pm2 startup
pm2 save

# 8. 配置 Nginx 反向代理
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/default
# 配置代理到 localhost:3000

# 9. 配置 SSL（使用 Let's Encrypt）
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 環境變數完整列表

```env
# 資料庫連接
DATABASE_URL=mysql://user:password@host:port/database

# S3 儲存
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=your_bucket
AWS_S3_ENDPOINT=https://s3.amazonaws.com

# JWT 和安全
JWT_SECRET=your_random_secret_min_32_chars

# Node 環境
NODE_ENV=production

# 服務器配置
PORT=3000
```

---

## 自定義域名設置

### 使用 Cloudflare（推薦）
1. 進入 Cloudflare Dashboard
2. Add Site → 輸入您的域名
3. 更改 Nameservers 到 Cloudflare
4. DNS → CNAME 記錄 → 指向您的部署 URL
5. SSL/TLS → Full (Strict)

### 使用 GoDaddy / Namecheap
1. 登錄域名註冊商
2. DNS 設置 → 添加 CNAME 記錄
3. 指向您的部署 URL（例如: your-app.vercel.app）

---

## 首次部署檢查清單

- [ ] 資料庫已創建並可連接
- [ ] S3 bucket 已創建並配置 CORS
- [ ] 環境變數已全部設置
- [ ] 數據庫遷移已執行 (`pnpm drizzle-kit migrate`)
- [ ] 管理員密碼已初始化 (`node seed-admin.mjs`)
- [ ] 落地頁可訪問 (http://your-domain.com)
- [ ] 後台可訪問 (http://your-domain.com/admin)
- [ ] 後台密碼登錄成功
- [ ] 表單提交正常工作
- [ ] 圖片上傳到 S3 成功

---

## 常見問題

### Q: 如何更改管理員密碼？
```bash
node seed-admin.mjs your_new_password
```

### Q: 如何備份資料庫？
```bash
# MySQL
mysqldump -u user -p database > backup.sql

# 恢復
mysql -u user -p database < backup.sql
```

### Q: 如何查看服務器日誌？
```bash
# Vercel
vercel logs

# Railway
railway logs

# EC2 (PM2)
pm2 logs komoreco
```

### Q: 如何更新代碼？
```bash
git pull origin main
pnpm install
pnpm build
# 重啟服務（根據部署平台）
```

---

## 性能優化建議

1. **啟用 CDN**: 使用 Cloudflare 或 AWS CloudFront 加速靜態資源
2. **資料庫優化**: 為 `phone` 字段添加索引（已自動添加）
3. **緩存策略**: 配置 HTTP 緩存頭減少數據庫查詢
4. **監控**: 使用 Sentry、DataDog 或 New Relic 監控應用健康

---

## 支持和幫助

- 文檔: https://docs.example.com
- 社區論壇: https://forum.example.com
- 技術支持: support@example.com

祝部署順利！🚀
