# School Classroom Reservation System

A modern, full-stack classroom booking application featuring an Apple Calendar-inspired interface, administrative approval workflow, and automatic Google Calendar synchronization.

## 🌟 Key Features

- **Apple Calendar Aesthetic**: Minimalist, high-contrast UI designed with a native macOS/iOS feel, including full Dark Mode support.
- **Mobile & Touch Optimized**: Supports long-press to select time slots on touchscreens. The calendar toolbar automatically stacks on narrow screens for better usability.
- **Admin Workflow**: Users submit "pending" requests. Admins review, approve, or reject them via a dedicated `/admin` dashboard.
- **Google Calendar Integration**: Automatically syncs approved reservations to a shared Google Calendar.
- **Localized for Taiwan**: Fully supports `zh-tw` locale, including date formatting and common classroom equipment names.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+) and npm installed.

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in a `.env` file (see `GOOGLE_CALENDAR_GUIDE.md` for API setup).
4. Start the development server:
   ```bash
   npm run dev
   ```
   *Runs on `http://localhost:3001/api`.*

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *Runs on `http://localhost:5173` (proxies `/api` to backend).*

---

## 🛠 System Architecture

- **Frontend**: React 19 + TypeScript + Vite. Powered by FullCalendar 6 for the scheduling interface.
- **Backend**: Node.js (Express) + TypeScript. Decoupled API server.
- **Separation**: The frontend and backend are completely decoupled. The backend only serves API requests at `/api`, and the frontend is a standalone static application.

---

## 📦 Deployment

To create a production-ready package:
1. Run `bash deploy.sh`.
2. This will generate a `publish/` folder containing:
   - `frontend/`: Standalone static files for the web app.
   - `backend/`: API server logic.
   - `web.config`: Pre-configured IIS rule to handle reverse proxying and SPA routing.

---

## 📅 Google Calendar Integration

For detailed instructions on setting up Google Cloud Console, Service Accounts, and Calendar permissions, please refer to [**GOOGLE_CALENDAR_GUIDE.md**](./GOOGLE_CALENDAR_GUIDE.md).

---

## 📝 Customization

- **Theming**: All colors, fonts, and spacing variables are defined in `frontend/src/index.css`.
- **Classrooms**: Modify the list of available rooms in the `ROOMS` constant within `frontend/src/ReservationModal.tsx`.
