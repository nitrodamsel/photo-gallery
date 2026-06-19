# 📷 PhotoGallery

A self-hosted photo gallery web application built with **Express.js** and **EJS**. Upload your photos, tag them for easy retrieval, and explore rich EXIF metadata — all from a clean, responsive interface.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Easy Uploads** | Drag-and-drop or browse to upload JPEG, PNG, WebP, and HEIC images |
| **Smart Tagging** | Organise photos with custom tags and filter the gallery instantly |
| **EXIF Extraction** | Auto-capture camera make/model, aperture, shutter speed, ISO, and GPS |
| **Gallery View** | Responsive masonry-style grid with smooth hover animations |

---

## 🛠 Prerequisites

- **Node.js** >= 18 (check with `node -v`)
- **npm** >= 9 (check with `npm -v`)

---

## 🚀 Setup & Running

```bash
# 1. Clone the repository
git clone <repo-url>
cd photo-gallery-app

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env as needed

# 4. Start the development server (with hot-reload)
npm run dev

# — or start in production mode —
npm start
```

The app will be available at **http://localhost:3000** (or the `PORT` you set in `.env`).

---

## 🔍 Health Check

```bash
curl http://localhost:3000/health
```

```json
{
  "status": "ok",
  "timestamp": "2026-06-19T00:00:00.000Z",
  "uptime": 42.3,
  "environment": "development"
}
```

---

## 📁 Project Structure

```
photo-gallery-app/
├── app.js                  # Express app factory
├── server.js               # Entry point
├── config/
│   └── index.js            # Centralised config with env defaults
├── routes/
│   └── index.js            # Root router (/, /health)
├── middleware/             # Custom Express middleware (future phases)
├── views/
│   ├── layouts/
│   │   └── base.ejs        # Base HTML shell
│   ├── partials/
│   │   └── navbar.ejs      # Top navigation bar
│   ├── home.ejs            # Landing page
│   └── error.ejs           # Error page
├── public/
│   ├── css/
│   │   └── main.css        # Custom styles, gallery grid, tag badges
│   └── js/
│       └── main.js         # Client-side bootstrapper
├── uploads/                # User-uploaded images (gitignored)
├── .env                    # Local environment config (gitignored)
├── .env.example            # Template for environment variables
├── .gitignore
└── package.json
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `NODE_ENV` | `development` | `development` or `production` |
| `UPLOAD_DIR` | `uploads` | Directory for uploaded images |
| `MAX_FILE_SIZE_MB` | `10` | Maximum upload size in megabytes |
| `DB_PATH` | `./data/gallery.db` | Path to the SQLite database file |

---

## 🗺 Phase Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| **1 – Foundation** | ✅ Complete | Express server, EJS templates, static assets, health check |
| **2 – File Upload** | 🔜 Planned | Multer integration, image validation, Sharp processing |
| **3 – Database** | 🔜 Planned | Sequelize models, SQLite persistence, photo CRUD |
| **4 – EXIF & Tags** | 🔜 Planned | exifr metadata extraction, tag management UI |
| **5 – Gallery UI** | 🔜 Planned | Masonry grid, lightbox viewer, filtering & search |
| **6 – Polish** | 🔜 Planned | Pagination, error handling, accessibility, deployment |

---

## 📜 Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start with nodemon (hot-reload) |
| `start` | `npm start` | Start in production mode |
| `test` | `npm test` | Run tests (placeholder) |

---

## 📄 License

MIT © 2026 PhotoGallery