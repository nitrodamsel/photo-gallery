# 📷 Photo Gallery App

A full-featured personal photo gallery built with **Node.js**, **Express**, and **EJS**. Upload photos, add tags, and explore your collection with automatic EXIF data extraction and a responsive grid layout.

---

## ✨ Features

- 📤 **Drag-and-drop uploads** — JPEG, PNG, GIF, WebP support
- 🏷️ **Smart tagging** — Add and filter by custom tags
- 📍 **EXIF extraction** — Camera settings, GPS, and timestamps
- 🖼️ **Responsive gallery** — Beautiful masonry-style grid
- ⚡ **Image processing** — Automatic thumbnail generation via Sharp
- 🗄️ **SQLite persistence** — Lightweight, zero-configuration database

---

## 🚀 Prerequisites

| Requirement | Version  |
|-------------|----------|
| Node.js     | >= 18.x  |
| npm         | >= 9.x   |

---

## 🛠️ Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd photo-gallery-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` as needed:

```env
PORT=3000
NODE_ENV=development
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10
DB_PATH=./database.db
```

### 4. Start the development server

```bash
npm run dev
```

The server will start at **http://localhost:3000** with hot-reloading via nodemon.

### 5. Production start

```bash
npm start
```

---

## 📁 Project Structure

```
photo-gallery-app/
├── app.js                  # Express app factory
├── server.js               # Entry point
├── config/
│   └── index.js            # Centralised configuration
├── routes/
│   └── index.js            # Root router (/, /health)
├── middleware/             # Custom middleware (future phases)
├── views/
│   ├── home.ejs            # Landing page
│   ├── error.ejs           # Error page
│   ├── layouts/
│   │   └── base.ejs        # Base HTML shell
│   └── partials/
│       └── navbar.ejs      # Navigation bar
├── public/
│   ├── css/
│   │   └── main.css        # Custom styles & design tokens
│   └── js/
│       └── main.js         # Client-side bootstrapper
├── uploads/                # User-uploaded images (gitignored)
├── .env                    # Local environment config (gitignored)
├── .env.example            # Environment variable template
├── .gitignore
└── package.json
```

---

## 🔌 API Endpoints

| Method | Path      | Description                    |
|--------|-----------|--------------------------------|
| GET    | `/`       | Home page                      |
| GET    | `/health` | JSON health-check              |

### Health Check Response

```json
{
  "status": "ok",
  "timestamp": "2026-06-19T12:00:00.000Z",
  "uptime": 42.5,
  "environment": "development",
  "version": "1.0.0"
}
```

---

## 📜 Available Scripts

| Script        | Command         | Description                        |
|---------------|-----------------|------------------------------------|
| `npm start`   | `node server.js` | Start production server           |
| `npm run dev` | `nodemon server.js` | Start with hot-reloading      |
| `npm test`    | —               | Run tests (future phases)          |

---

## 🗺️ Phase Roadmap

| Phase | Description                                    | Status     |
|-------|------------------------------------------------|------------|
| 1     | Foundation & Project Scaffold                  | ✅ Complete |
| 2     | Image Upload & Storage                         | 🔜 Planned  |
| 3     | Gallery View & Browsing                        | 🔜 Planned  |
| 4     | Tagging System                                 | 🔜 Planned  |
| 5     | EXIF Data Extraction & Display                 | 🔜 Planned  |
| 6     | Search & Filtering                             | 🔜 Planned  |
| 7     | Image Detail View & Lightbox                   | 🔜 Planned  |
| 8     | Performance, Polish & Deployment               | 🔜 Planned  |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📄 License

MIT