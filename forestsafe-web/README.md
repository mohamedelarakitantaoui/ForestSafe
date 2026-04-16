# 🌲 ForestSafe — Protect the Forests of Ifrane

ForestSafe is a community-driven web application for reporting and monitoring environmental threats — fires, illegal dumping, and other incidents — in the forests surrounding Ifrane, Morocco. Citizens submit geo-located reports with photo evidence, and park rangers receive real-time alerts via a live map and WhatsApp integration.

## Team Members

| Name | Role |
|---|---|
| **Ghali Abouraicha** | Developer |
| **Youssef Dahbi** | Developer |
| **Zineb Maimmadi** | Developer |
| **Nermine Sabri** | Developer |

> Built as a university project at Al Akhawayn University, Ifrane.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Leaflet, Recharts, react-hot-toast, i18next |
| Backend | Express.js, SQLite (better-sqlite3) |
| Other | Firebase (optional storage), WhatsApp Web sharing |

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** (comes with Node.js)

> No database server needed — SQLite runs as a local file automatically.

### Backend

```bash
cd forestsafe-api
cp .env.example .env
npm install
npm run db:migrate           # creates data/forestsafe.db
npm run dev                  # starts on http://localhost:3001
```

### Frontend

```bash
cd forestsafe-web
cp .env.example .env         # set VITE_API_URL if needed
npm install
npm run dev                  # starts on http://localhost:5173
```

### Production Build

```bash
cd forestsafe-web
npm run build                # outputs to dist/
npm run preview              # preview the production build locally
```

## Admin Access

The admin dashboard is protected by a password.

> **Password for graders:** `forestsafe2026`

Navigate to `/admin` and enter the password to access the dashboard where you can view analytics and mark reports as resolved.

## Features

- 📝 **Incident Reporting** — Submit fire, dumping, or other reports with GPS location, photo evidence, and urgency level
- 🗺️ **Live Map** — View all reports on an interactive clustered map with type/status/date filters
- 📊 **Admin Dashboard** — Charts, stats, sortable table, and resolve actions
- 📱 **WhatsApp Sharing** — One-tap sharing of reports to ranger WhatsApp groups
- 🌐 **Multilingual** — English, French, and Arabic (RTL) support
- 📶 **Offline Support** — Reports are saved locally when offline and synced when connection returns
- 🔔 **Toast Notifications** — App-wide success/error feedback via react-hot-toast

## Screenshots

> _Add screenshots here_

| Screen | Screenshot |
|---|---|
| Home Page | ![Home](screenshots/home.png) |
| Report Form | ![Report](screenshots/report.png) |
| Live Map | ![Map](screenshots/map.png) |
| Report History | ![History](screenshots/history.png) |
| Admin Dashboard | ![Admin](screenshots/admin.png) |

## License

This project was built for educational purposes at Al Akhawayn University.
