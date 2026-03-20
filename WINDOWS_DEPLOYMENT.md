# Windows IIS 快速部署指南 (針對學校 IT 管理員)

本系統採 **Node.js (Backend)** + **IIS (Reverse Proxy)** 架構，支援在現有網站的 **子目錄** 下運行（例如：`https://school.edu/reservation/`）。

---

## 1. 環境準備 (Prerequisites)

1.  **安裝 Node.js**: 下載並安裝最新的 LTS 版本。
2.  **安裝 IIS URL Rewrite 模組**: [下載網址](https://www.iis.net/downloads/microsoft/url-rewrite)。
3.  **安裝 IIS Application Request Routing (ARR)**: [下載網址](https://www.iis.net/downloads/microsoft/application-request-routing)。
    *   **設定 Proxy**: 開啟 IIS 管理員 -> 點擊伺服器節點 -> **Application Request Routing Cache** -> 右側 **Server Proxy Settings** -> 勾選 **Enable proxy** -> 點擊 **Apply**。

---

## 2. 部署步驟 (Deployment)

1.  **傳輸檔案**: 將 `publish/` 資料夾複製到伺服器（例如：`C:\apps\reservation`）。
2.  **IIS 設定 (新增應用程式)**:
    *   在 IIS 管理員中，右鍵點擊您的學校網站 -> **「新增應用程式 (Add Application)」**。
    *   **別名 (Alias)**: `reservation`
    *   **實體路徑**: 指向剛複製的 `publish/` 資料夾。
    *   **注意**: 系統已內附 `web.config`，會自動處理路徑轉發，無需手動設定 URL Rewrite。
3.  **啟動 Node.js 服務**:
    以系統管理員身分開啟 PowerShell，進入該資料夾並執行：
    ```powershell
    npm install -g pm2
    cd C:\apps\reservation
    pm2 start server.js --name "reservation-system"
    pm2 save
    ```

---

## 3. 測試與驗證

*   造訪網址：`https://您的網站.edu/reservation/`
*   系統會自動讀取目錄下 `dist/index.html`。
*   如有 API 連線問題，請確認 `publish/.env` 中的 `PORT` 是否與 `web.config` 中的 `3001` 一致。

---

## 常見問題排除

*   **結尾斜線**: 請務必輸入結尾的 `/`。若未輸入，`web.config` 已設定自動跳轉。
*   **讀寫權限**: 請確保 IIS 使用者對該資料夾有讀取權限，且執行 PM2 的使用者對 `db.json` 有寫入權限。
*   **查看錯誤**: 可執行 `pm2 logs reservation-system` 查看。
