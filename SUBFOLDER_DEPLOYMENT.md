# Guide: Running the Reservation System in a Subfolder

This guide explains how to configure the Classroom Reservation System to run on a subfolder path, such as `https://school.edu/reservation`.

---

## 1. Frontend Configuration

To ensure the frontend loads its assets (JS, CSS, images) from the correct subfolder, you need to update the Vite build settings and the API base URL.

### A. Update `frontend/vite.config.ts`
Add the `base` property to the configuration. This ensures that the generated `index.html` references files correctly (e.g., `/reservation/assets/...`).

```typescript
// frontend/vite.config.ts
export default defineConfig({
  plugins: [react()],
  base: '/reservation/', // <-- Add this line
  server: {
    // ... other settings ...
    proxy: {
      '/reservation/api': { // <-- Update proxy path
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
})
```

### B. Update `frontend/src/App.tsx`
Update the `API_BASE_URL` to include the subfolder prefix so the frontend knows where to find the backend.

```typescript
// frontend/src/App.tsx
const API_BASE_URL = '/reservation/api'; // <-- Update this
```

---

## 2. Backend Configuration

The backend needs to be aware that it is serving the app from the `/reservation` prefix.

### A. Update `backend/src/index.ts`
Modify the Express routes and static file serving to listen on the `/reservation` path. The easiest way is to use an Express `Router`.

**Search for this block in `backend/src/index.ts` (usually near the end):**

```typescript
// --- Endpoints ---

// Create a router for all API endpoints
const apiRouter = express.Router();

// Move all existing app.post('/api/login', ...) to apiRouter.post('/login', ...)
apiRouter.post('/login', (req, res) => { ... });
apiRouter.get('/rooms', authUser, (req, res) => { ... });
// ... [Move all /api routes here] ...

// Mount the router with the subfolder prefix
app.use('/reservation/api', apiRouter);

// Serve frontend static files
const frontendPath = process.env.FRONTEND_PATH || ...;
app.use('/reservation', express.static(frontendPath));

// Catch-all route for SPA (at the subfolder)
app.use('/reservation', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend build not found.');
  }
});
```

---

## 3. Rebuild the Application

After making these changes, you must rebuild the application to apply the new paths:

```bash
# Run the deployment script to regenerate the 'publish' folder
bash deploy.sh
```

---

## 4. Nginx Configuration

Update your Nginx site configuration (`/etc/nginx/sites-available/area-reservation`) to handle the subfolder proxying.

```nginx
server {
    listen 80;
    server_name school.edu; # Your main domain

    # Proxy the subfolder to the reservation app
    location /reservation {
        proxy_pass http://localhost:3001; # Matches the PORT in your .env
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Ensure trailing slashes are handled
        rewrite ^/reservation$ /reservation/ permanent;
    }
}
```

Enable the configuration and restart Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## Summary Checklist
1. [ ] Set `base: '/reservation/'` in `vite.config.ts`.
2. [ ] Set `API_BASE_URL = '/reservation/api'` in `App.tsx`.
3. [ ] Update `backend/src/index.ts` to use `/reservation/api` and `/reservation` for static files.
4. [ ] Run `bash deploy.sh`.
5. [ ] Configure Nginx to proxy `/reservation`.
