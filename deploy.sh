#!/bin/bash

# Exit on any error
set -e

echo "🚀 開始編譯發佈版本 (前後端分離模式)..."

# 1. Build Frontend
echo "📦 編譯前端..."
cd frontend
npm install
npm run build
cd ..

# 2. Build and Bundle Backend
echo "📦 編譯後端..."
cd backend
npm install
npm run bundle
cd ..

# 3. Create Deployment Package
echo "📂 建立 'publish' 發佈資料夾..."
rm -rf publish
mkdir -p publish/frontend
mkdir -p publish/backend

# 複製後端檔案
cp backend/dist/index.js publish/backend/server.js
cp backend/.env publish/backend/.env
[ -f backend/google-key.json ] && cp backend/google-key.json publish/backend/

# 複製前端檔案至 frontend 資料夾
cp -r frontend/dist/* publish/frontend/

# 建立 IIS 專用的 web.config (放在 frontend 內，或是在根目錄轉導)
# 這裡我們放在根目錄，幫助 IIS 同時處理 API 轉發與靜態檔案
cat <<EOF > publish/web.config
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <!-- 1. API 轉發: 將所有 /api/* 請求轉發到 PM2 執行的後端伺服器 (Node.js) -->
                <rule name="APIProxy" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <action type="Rewrite" url="http://localhost:3001/api/{R:1}" />
                </rule>
                
                <!-- 2. 靜態檔案路徑對應: 將根目錄請求導向 frontend 子目錄 -->
                <rule name="FrontendMapping" stopProcessing="true">
                    <match url="^(?!api|frontend)(.*)" />
                    <action type="Rewrite" url="frontend/{R:1}" />
                </rule>

                <!-- 3. SPA 支援: 若找不到實體檔案，則導向 frontend/index.html -->
                <rule name="SPA" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="frontend/index.html" />
                </rule>
            </rules>
        </rewrite>
        <staticContent>
            <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="7.00:00:00" />
        </staticContent>
    </system.webServer>
</configuration>
EOF

echo "✅ 成功！發佈檔案已準備好在 'publish' 資料夾。"
echo "------------------------------------------------------------"
echo "部署方式 (分離部署)："
echo "1. 將 'publish' 資料夾交給 IT人員。"
echo "2. IIS 設定：實體路徑指向 'publish'。"
echo "3. 後端啟動：在 'publish/backend' 執行: pm2 start server.js --name \"reservation-api\""
echo "4. 前端運作：IIS 會根據 web.config 將請求導向 'publish/frontend' 並轉發 API。"
echo "------------------------------------------------------------"
