# 📸 PhotoGallery

A full-featured photo gallery web application built with **Express.js** and **EJS**. Upload, organize, tag, and explore your photo collection with automatic EXIF metadata extraction, smart thumbnails, and powerful search.

---

## ✨ Features

- 🖼️ **Responsive Gallery** — Masonry-style grid with smooth hover effects
- 📤 **Drag-and-Drop Upload** — JPEG, PNG, WebP, and more
- 🏷️ **Tagging System** — Custom tags with filter and search
- 📷 **EXIF Metadata** — Camera model, aperture, shutter speed, GPS, and more
- ✂️ **Image Processing** — Auto-generated thumbnails via Sharp
- 🔍 **Full-Text Search** — Across titles, descriptions, and tags

---

## 🛠️ Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x

---

## 🚀 Setup & Running

### 1. Clone the repository

```bash
git clone <repo-url>
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

Open `.env` and adjust any values as needed (the defaults work out of the box for local development).

### 4. Start the development server

```bash
npm run dev
```

The server will start with **nodemon** for hot-reloading.

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Start in production mode

```bash
npm start
```

---

## 📡 API Endpoints

| Method | Path      | Description                        |
|--------|-----------|------------------------------------|
| GET    | `/`       | Homepage with feature highlights   |
| GET    | `/health` | Health-check — returns JSON status |
| GET    | `/gallery`| Photo gallery *(Phase 2)*          |
| GET    | `/upload` | Upload form *(Phase 2)*            |
| GET    | `/tags`   | Tag browser *(Phase 3)*            |

---

## 📁 Project Structure

```
photo-gallery-app/
├── app.js              # Express app factory
├── server.js           # Entry point — starts the HTTP server
├── .env                # Local environment config (gitignored)
├── .env.example        # Template for environment variables
├── .gitignore
├── package.json
├── config/
│   └── index.js        # Centralized config with defaults & validation
├── middleware/         # Custom Express middleware (future phases)
├── public/
│   ├── css/
│   │   └── main.css    # CSS variables, gallery grid, card & tag styles
│   └── js/
│       └── main.js     # Client-side bootstrapper
├── routes/
│   └── index.js        # Root router (GET /, GET /health)
├── uploads/            # User-uploaded images (gitignored)
└── views/
    ├── home.ejs         # Landing page
    ├── error.ejs        # Error page
    ├── layouts/
    │   └── base.ejs     # Base HTML shell with Bootstrap 5
    └── partials/
        └── navbar.ejs   # Navigation bar
```

---

## 🗺️ Phase Roadmap

| Phase | Description                                      | Status      |
|-------|--------------------------------------------------|-------------|
| 1     | Foundation & Project Scaffold                    | ✅ Complete  |
| 2     | Image Upload & Storage                           | 🔲 Planned  |
| 3     | Gallery View & Tagging                           | 🔲 Planned  |
| 4     | EXIF Metadata Extraction                         | 🔲 Planned  |
| 5     | Search & Filtering                               | 🔲 Planned  |
| 6     | Image Processing & Thumbnails                    | 🔲 Planned  |

---

## 🧰 Tech Stack

| Layer        | Technology                         |
|--------------|------------------------------------|
| Framework    | Express.js 4.x                     |
| Templating   | EJS                                |
| Styling      | Bootstrap 5 + Custom CSS           |
| Database     | SQLite via Sequelize               |
| Image Proc.  | Sharp                              |
| EXIF         | exifr                              |
| Upload       | Multer                             |
| Dev Server   | Nodemon                            |
| Config       | dotenv                             |

---

## 📝 Environment Variables

| Variable          | Default          | Description                          |
|-------------------|------------------|--------------------------------------|
| `PORT`            | `3000`           | HTTP server port                     |
| `NODE_ENV`        | `development`    | Runtime environment                  |
| `UPLOAD_DIR`      | `uploads`        | Directory for uploaded images        |
| `MAX_FILE_SIZE_MB`| `10`             | Maximum upload file size in MB       |
| `DB_PATH`         | `./database.db`  | SQLite database file path            |

---

## 📄 License

MIT