# 📸 PhotoGallery

A lightweight, self-hosted photo gallery built with **Node.js**, **Express**, and **EJS**. Upload photos, browse them in a beautiful responsive grid, organise with custom tags, and explore automatically extracted EXIF metadata.

---

## ✨ Features

| Phase | Feature |
|-------|---------|
| ✅ 1 | Project scaffold — Express server, EJS templates, static assets |
| 🔜 2 | Photo upload with Multer, Sharp thumbnail generation |
| 🔜 3 | Gallery grid with lightbox & pagination |
| 🔜 4 | Tag management & filtering |
| 🔜 5 | EXIF data extraction & display |
| 🔜 6 | SQLite persistence via Sequelize |

---

## 🛠 Prerequisites

| Tool | Version |
|------|---------|
| [Node.js](https://nodejs.org/) | >= 18 |
| npm | >= 9 |

---

## 🚀 Quick Start

### 1. Clone & install dependencies

```bash
git clone https://github.com/your-username/photo-gallery.git
cd photo-gallery
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and adjust any values as needed:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port the server listens on |
| `NODE_ENV` | `development` | Runtime environment |
| `UPLOAD_DIR` | `uploads` | Directory for uploaded images |
| `MAX_FILE_SIZE_MB` | `10` | Maximum upload file size in megabytes |
| `DB_PATH` | `./database.db` | Path to the SQLite database file |

### 3. Start the development server

```bash
npm run dev
```

The server will start with **nodemon** for hot-reloading. Visit [http://localhost:3000](http://localhost:3000).

### 4. Production start

```bash
npm start
```

---

## 📁 Project Structure

```
photo-gallery/
├── app.js               # Express app factory
├── server.js            # Entry point — starts HTTP server
├── .env                 # Local environment config (gitignored)
├── .env.example         # Environment variable template
├── config/
│   └── index.js         # Centralised config with defaults & validation
├── middleware/          # Custom Express middleware (added in later phases)
├── routes/
│   └── index.js         # Root router (GET /, GET /health)
├── views/
│   ├── layouts/
│   │   └── base.ejs     # Base HTML shell
│   ├── partials/
│   │   └── navbar.ejs   # Top navigation bar
│   ├── home.ejs         # Landing page
│   └── error.ejs        # Error page
├── public/
│   ├── css/
│   │   └── main.css     # Custom styles, gallery grid, tag badges
│   └── js/
│       └── main.js      # Client-side bootstrapper
└── uploads/             # User-uploaded images (gitignored)
```

---

## 🔗 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Landing page |
| `GET` | `/health` | Health-check — returns JSON status |

---

## 🧩 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (hot-reload) |
| `npm start` | Start in production mode |
| `npm test` | Placeholder for test runner |

---

## 📜 License

MIT © 2026 PhotoGallery