# Deployment Guide

This guide explains how to bundle the classroom reservation system into a single folder for your school's Linux server.

---

## 1. Local Build & Bundle

To prepare the deployment package, follow these steps on your development machine (Windows, Mac, or Linux):

1.  **Run the Deployment Script**:
    ```bash
    bash deploy.sh
    ```
    This script will:
    *   Build the frontend (`dist` folder).
    *   Bundle the backend into a standalone `server.js` (includes all dependencies).
    *   Create a `publish/` folder with everything you need.

2.  **Verify the `publish/` Folder**:
    After the script finishes, you will see a `publish` directory:
    ```text
    /publish/
    ├── server.js (Bundled Backend)
    └── dist/ (Frontend Assets)
    ```

---

## 2. Server Deployment

1.  **Upload the `publish/` Folder**:
    Upload the contents of the `publish` folder to your school's server (using `scp`, `sftp`, or a USB drive).

2.  **Configure Environment Variables**:
    Create a `.env` file inside the same folder on the server:
    ```bash
    # Path to your frontend folder (relative to server.js)
    FRONTEND_PATH="./dist"

    # Port for the server to run on
    PORT=3001

    # Google Calendar ID (if applicable)
    GOOGLE_CALENDAR_ID=your_calendar_id@group.calendar.google.com

    # Google Calendar Credentials file name
    # (Put your google-key.json in the same folder)
    GOOGLE_APPLICATION_CREDENTIALS=google-key.json
    ```

3.  **Run with PM2 (Recommended)**:
    Ensure **Node.js** is installed on the server. We recommend using `pm2` to keep the application running in the background.
    ```bash
    # Install PM2 (one-time setup)
    npm install -g pm2

    # Start the application
    pm2 start "node server.js" --name "area-reservation"

    # Ensure it starts on server reboot
    pm2 save
    pm2 startup
    ```

## 3. Network Configuration (Nginx & HTTPS)

To access your app via a standard domain (e.g., `https://reservation.school.edu`), use Nginx as a reverse proxy and Certbot for SSL.

### A. Install Nginx & Certbot
On your Linux server:
```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

### B. Configure Nginx
Create a configuration file at `/etc/nginx/sites-available/area-reservation`:
```nginx
server {
    listen 80;
    server_name reservation.school.edu; # Replace with your domain

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/area-reservation /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### C. Enable HTTPS with Certbot
Run the following command and follow the prompts:
```bash
sudo certbot --nginx -d reservation.school.edu
```
Certbot will automatically handle SSL certificate issuance, Nginx configuration, and auto-renewal.

### D. Verify the Final "Bridge" (Port 443 to 3001)
After Certbot runs, your configuration file (`/etc/nginx/sites-available/area-reservation`) should look like this. Notice how it "pushes" traffic from 443 to 3001:

```nginx
server {
    server_name reservation.school.edu;

    # This block handles the HTTPS traffic on port 443
    location / {
        proxy_pass http://localhost:3001; # <--- This maps 443 to your app
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl; # Managed by Certbot
    # ... (SSL certificate lines added by Certbot)
}

server {
    # This block redirects all port 80 (HTTP) traffic to port 443 (HTTPS)
    if ($host = reservation.school.edu) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name reservation.school.edu;
    return 404;
}
```

---

## Troubleshooting

*   **Port Collision**: If port 3001 is already in use, update the `PORT` in your `.env` file.
*   **Permissions**: If `deploy.sh` doesn't run, give it execution permissions: `chmod +x deploy.sh`.
*   **Database**: The system uses `db.json` for persistence. This file will be created automatically in the same folder as `server.js` when you first run it.
