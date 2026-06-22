# 📷 PhotoGallery

A full-featured personal photo gallery web application built with **Express.js**, **EJS**, and **SQLite**.
Upload, organise, tag, and explore your photos — all from a clean, responsive interface.

---

## ✨ Features

- **Smart Gallery** — Responsive grid with smooth hover effects
- **Easy Uploads** — Bulk image upload with automatic thumbnail generation
- **Tag & Search** — Organise photos with custom tags and search instantly
- **EXIF Insights** — View camera metadata (shutter speed, aperture, ISO, GPS, and more)

---

## 🛠️ Prerequisites

- **Node.js** `>= 18.x` — [Download](https://nodejs.org/)
- **npm** `>= 9.x` (bundled with Node.js)

---

## 🚀 Setup & Development

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

Edit `.env` to customise your settings (port, upload limits, etc.).

### 4. Start the development server

```bash
npm run dev
```

The app will be available at **http://localhost:3000** with hot-reloading via `nodemon`.

### 5. Start in production mode

```bash
npm start
```

---

## 🔑 Environment Variables

| Variable           | Default        | Description                              |
|--------------------|----------------|------------------------------------------|
| `PORT`             | `3000`         | Port the server listens on               |
| `NODE_ENV`         | `development`  | Environment (`development`/`production`) |
| `UPLOAD_DIR`       | `uploads`      | Directory for storing uploaded images    |
| `MAX_FILE_SIZE_MB` | `10`           | Maximum upload file size in megabytes    |
| `DB_PATH`          | `./database.db`| Path to the SQLite database file         |

---

## 🩺 Health Check

```
GET /health
```

Returns a JSON object with server status:

```json
{
  "status": "ok",
  "timestamp": "2026-06-22T12:00:00.000Z",
  "uptime": 42,
  "environment": "development",
  "version": "1.0.0"
}
```

---

## 📁 Project Structure

```
photo-gallery-app/
├── app.js              # Express app factory
├── server.js           # Entry point — starts the HTTP server
├── .env                # Local environment config (gitignored)
├── .env.example        # Environment variable template
├── .gitignore
├── package.json
│
├── config/
│   └── index.js        # Centralised config with validation
│
├── routes/
│   └── index.js        # Root router (GET /, GET /health)
│
├── middleware/         # Custom Express middleware (future phases)
│
├── views/
│   ├── home.ejs        # Homepage
│   ├── error.ejs       # Error page
│   ├── layouts/
│   │   └── base.ejs    # Base HTML shell
│   └── partials/
│       └── navbar.ejs  # Top navigation bar
│
├── public/
│   ├── css/
│   │   └── main.css    # Custom styles, gallery grid, tag badges
│   └── js/
│       └── main.js     # Client-side JS bootstrapper
│
└── uploads/            # User-uploaded images (gitignored)
```

---

## 🗺️ Phase Roadmap

| Phase | Description                                              | Status |
|-------|----------------------------------------------------------|--------|
| **1** | Foundation & Project Scaffold                            | ✅ Done |
| **2** | Image Upload & Storage                                   | 🔜 Planned |
| **3** | Gallery View & Thumbnail Generation                      | 🔜 Planned |
| **4** | EXIF Metadata Extraction & Display                       | 🔜 Planned |
| **5** | Tagging System & Search                                  | 🔜 Planned |
| **6** | Polish, Pagination & Performance                         | 🔜 Planned |

---

## 📄 Licence

ISC