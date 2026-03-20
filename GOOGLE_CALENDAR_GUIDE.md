# Google Calendar API 整合指南

本指南將引導您如何將此預約系統與 Google Calendar 整合，使得管理員核准預約後，系統會自動在共用行事曆上建立活動。

## 1. 建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)。
2. 點擊「建立專案」，輸入專案名稱(例如：`School-Reservation-System`)。
3. 在搜尋欄搜尋 「Google Calendar API」，點擊進入後點選「啟用」。

## 2. 建立服務帳戶 (Service Account)

1. 在左側選單選擇「API 和服務」 > 「憑證」。
2. 點擊「建立憑證」 > 「服務帳戶」。
3. 輸入服務帳戶名稱(例如：`calendar-sync`)，點擊「建立並繼續」。
4. 角色選擇「編輯者」或「Owner」(非必要，但方便測試)，完成建立。
5. 在服務帳戶列表中點擊剛建立的帳戶，切換到「金鑰 (Keys)」頁籤。
6. 點擊「新增金鑰」 > 「建立新金鑰」，選擇 **JSON** 格式並下載。
   - **重要：** 請將此檔案重新命名為 `google-key.json` 並存放在 `backend/` 目錄下。
   - **切記：** 不要將此檔案提交到 Git (已在 `.gitignore` 中排除)。

## 3. 設定 Google 行事曆

1. 前往您的 [Google Calendar](https://calendar.google.com/)。
2. 建立一個新的行事曆(例如：「教室預約」)。
3. 點擊行事曆旁邊的三個點 > 「設定與共用」。
4. 在「與特定使用者共用」中，點擊「新增使用者」。
5. 輸入您在第 2 步建立的 **服務帳戶 Email**(例如：`calendar-sync@project-id.iam.gserviceaccount.com`)。
6. 權限設定為「變更活動」。
7. 向下滾動找到「行事曆 ID」(格式如：`xxxx@group.calendar.google.com`)，複製此 ID。

## 4. 設定後端環境變數

1. 在 `backend/` 目錄下開啟 `.env` 檔案。
2. 新增以下內容：
   ```env
   GOOGLE_CALENDAR_ID=您的行事曆ID
   GOOGLE_APPLICATION_CREDENTIALS=google-key.json
   ```

## 5. 程式碼邏輯說明

後端目前在 `backend/src/index.ts` 的 `approve` 路由中有一個 `TODO`。您可以引入 `googleapis` 庫來調用 API：

```typescript
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

const calendar = google.calendar({ version: 'v3', auth });

// 在核准邏輯中調用：
await calendar.events.insert({
  calendarId: process.env.GOOGLE_CALENDAR_ID,
  requestBody: {
    summary: `${res.room}: ${res.purpose}`,
    start: { dateTime: res.start },
    end: { dateTime: res.end },
  },
});
```
