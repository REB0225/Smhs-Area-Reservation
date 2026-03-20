# Guide: Running the Reservation System in a Subfolder (Windows/IIS)

This guide explains how to host the Classroom Reservation System on an existing Windows Server using **IIS (Internet Information Services)** at a subfolder path like `https://school.edu/reservation`.

---

## 1. Prerequisites (Windows Server)

1.  **Install Application Request Routing (ARR)**:
    *   Download and install from [iis.net](https://www.iis.net/downloads/microsoft/application-request-routing).
    *   In IIS Manager, click on the **Server Node** -> **Application Request Routing Cache**.
    *   Click **Server Proxy Settings** (right panel) and check **Enable proxy**.
2.  **Install URL Rewrite Module**:
    *   Download and install from [iis.net](https://www.iis.net/downloads/microsoft/url-rewrite).

---

## 2. Code Changes (Platform Agnostic)

You must modify these files before building the application.

### A. Update `frontend/vite.config.ts`
Set the base path so assets (JS/CSS) load from `/reservation/`.
```typescript
export default defineConfig({
  plugins: [react()],
  base: '/reservation/', // <-- Add this
  // ...
})
```

### B. Update `frontend/src/App.tsx`
Point the frontend to the new API location.
```typescript
const API_BASE_URL = '/reservation/api'; // <-- Update this
```

### C. Update `backend/src/index.ts`
Ensure the backend listens for the `/reservation` prefix. (See `SUBFOLDER_DEPLOYMENT.md` for the full Express Router example).
```typescript
app.use('/reservation/api', apiRouter);
app.use('/reservation', express.static(frontendPath));
```

---

## 3. Build & Deploy

1.  **Run Build**: On your development machine, run `bash deploy.sh`.
2.  **Copy Files**: Copy the `publish/` folder to your Windows server (e.g., `C:\apps\reservation`).
3.  **Start the App**: Use PM2 as described in `WINDOWS_DEPLOYMENT.md` to run the app on `localhost:3001`.

---

## 4. Configure IIS for the Subfolder

Instead of creating a new website, you will add a **Virtual Directory** or **Rule** to your existing "Default Web Site" (or wherever `school.edu` is hosted).

### Option A: Using `web.config` (Recommended)
Create a file named `web.config` in the root of your **Main School Website's** physical folder (e.g., `C:\inetpub\wwwroot\web.config`) and add this rule:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="ReverseProxyToReservation" stopProcessing="true">
                    <match url="^reservation/(.*)" />
                    <action type="Rewrite" url="http://localhost:3001/reservation/{R:1}" />
                </rule>
            </rules>
        </rewrite>
    </system.webServer>
</configuration>
```

### Option B: Using IIS Manager UI
1.  Open **IIS Manager**.
2.  Select your **Main School Website** (e.g., "Default Web Site").
3.  Double-click **URL Rewrite**.
4.  Click **Add Rule(s)...** -> **Inbound Rules** -> **Blank Rule**.
5.  **Name**: `Reservation Subfolder Proxy`
6.  **Match URL**:
    *   Requested URL: `Matches the Pattern`
    *   Using: `Regular Expressions`
    *   Pattern: `^reservation/(.*)`
7.  **Action**:
    *   Action type: `Rewrite`
    *   Rewrite URL: `http://localhost:3001/reservation/{R:1}`
8.  Click **Apply**.

---

## 5. Troubleshooting Windows Subfolders

*   **Trailing Slash**: If `school.edu/reservation` (without a slash) fails, ensure you visit `school.edu/reservation/`. You can add a redirect rule in IIS to force the trailing slash.
*   **Static Files (404)**: If the page loads but styles are missing, check if `frontend/vite.config.ts` was built with the `base: '/reservation/'` setting.
*   **Permissions**: Ensure the IIS User (usually `IIS_IUSRS`) has "Read" permissions to the folder where you placed the app.
