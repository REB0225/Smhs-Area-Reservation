# School Classroom Reservation System

A full-stack web application designed for school classroom bookings, featuring a calendar-based interface and an administrative approval workflow.

## Project Overview

### Technologies
- **Frontend**: React (v19) with TypeScript, Vite as the build tool.
- **Calendar**: [FullCalendar](https://fullcalendar.io/) (v6) with dayGrid, timeGrid, and interaction plugins.
- **Backend**: Node.js with Express and TypeScript.
- **Storage**: Local JSON-based persistence (`backend/src/db.json`) for reservations, with planned Google Calendar API integration.
- **Styling**: Vanilla CSS using modern CSS variables for easy theme customization and full dark mode support.

### Architecture
- **Monorepo Structure**: Separated `frontend` and `backend` directories.
- **Admin Workflow**: Users submit "pending" reservation requests via the calendar. Admins can view, approve, or reject these requests through a dedicated Admin Panel.
- **Google Calendar Integration**: Designed to sync approved reservations to a shared Google Calendar via a Service Account.

## Building and Running

### Prerequisites
- Node.js (v18+)
- npm

### Backend Setup
1. `cd backend`
2. `npm install`
3. Create `.env` from `.env.example`.
4. Run development server: `npm run dev` (runs on `http://localhost:3001`).

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. Run development server: `npm run dev` (runs on `http://localhost:5173`).

## Development Conventions

### Coding Style
- **TypeScript**: Strictly used across both frontend and backend for type safety.
- **Styling**: Use CSS variables defined in `frontend/src/index.css` (e.g., `--accent`, `--text-h`, `--bg`).
- **Theming**: The application supports `prefers-color-scheme: dark`. Always use theme variables to ensure visibility in both modes. Use `var(--text-h)` for high-contrast text.

### Folder Structure
- `frontend/src/components`: UI components like `ReservationModal` and `AdminDashboard`.
- `backend/src/index.ts`: Main API entry point and data persistence logic.

### Key Configuration Files
- `README.md`: Setup and Google Cloud configuration guide.
- `backend/.env.example`: Template for environment variables.
- `frontend/src/index.css`: Global theme and CSS variables.
