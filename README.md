# 📷 PhotoGallery

A personal photo gallery web application built with **Express.js** and **EJS** server-side rendering. Upload, organize, and browse your photos with tag-based filtering and EXIF metadata extraction.

---

## ✨ Features

- 🖼️ **Gallery View** — Responsive masonry-style grid with smooth hover effects
- 📤 **Easy Upload** — Single or multi-file uploads with automatic thumbnail generation
- 🏷️ **Tag System** — Add custom tags to photos and filter by any combination
- 🔍 **Search** — Full-text search across filenames, descriptions, and tags
- 📊 **EXIF Data** — Automatic extraction of camera metadata from images
- 🗃️ **SQLite Storage** — Lightweight, zero-config database via Sequelize ORM

---

## 📋 Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x

---

## 🚀 Setup & Installation

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

Edit `.env` and adjust any values as needed:

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

The server will start at **http://localhost:3000** with hot-reloading via `nodemon`.

---

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the production server |
| `npm run dev` | Start development server with hot-reload (nodemon) |
| `npm test` | Run tests |

---

## 🛠️ API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Home / landing page |
| `GET` | `/health` | Health check — returns JSON status |
| `GET` | `/gallery` | Photo gallery grid *(Phase 2)* |
| `GET` | `/upload` | Upload form *(Phase 3)* |
| `POST` | `/upload` | Handle file upload *(Phase 3)* |
| `GET` | `/tags` | Tag browser *(Phase 4)* |
| `GET` | `/photos/:id` | Single photo detail *(Phase 2)* |

---

## 📁 Project Structure

```
photo-gallery-app/
├── app.js              # Express app factory
├── server.js           # Entry point
├── config/
│   └── index.js        # Centralized config with validation
├── middleware/         # Custom Express middleware
├── routes/
│   └── index.js        # Root router (/, /health)
├── views/
│   ├── home.ejs        # Landing page
│   ├── error.ejs       # Error page
│   ├── layouts/
│   │   └── base.ejs    # Base HTML shell
│   └── partials/
│       └── navbar.ejs  # Navigation bar
├── public/
│   ├── css/
│   │   └── main.css    # Custom styles & gallery grid
│   └── js/
│       └── main.js     # Client-side bootstrapper
├── uploads/            # User-uploaded images (gitignored)
├── .env                # Local environment config (gitignored)
├── .env.example        # Environment variable template
├── .gitignore
└── package.json
```

---

## 🗺️ Phase Roadmap

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1** | Foundation & Project Scaffold | ✅ Complete |
| **Phase 2** | Gallery View & Image Model | 🔜 Planned |
| **Phase 3** | File Upload & Processing | 🔜 Planned |
| **Phase 4** | Tag System & Filtering | 🔜 Planned |
| **Phase 5** | Search & EXIF Metadata | 🔜 Planned |
| **Phase 6** | Polish & Production Ready | 🔜 Planned |

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Web Framework | [Express.js](https://expressjs.com/) |
| Templating | [EJS](https://ejs.co/) |
| CSS Framework | [Bootstrap 5](https://getbootstrap.com/) |
| Image Processing | [Sharp](https://sharp.pixelplumbing.com/) |
| EXIF Parsing | [exifr](https://github.com/MikeKovarik/exifr) |
| ORM | [Sequelize](https://sequelize.org/) |
| Database | SQLite via [sqlite3](https://github.com/TryGhost/node-sqlite3) |
| Dev Server | [nodemon](https://nodemon.io/) |
| Env Config | [dotenv](https://github.com/motdotla/dotenv) |

---

## 📄 License

MIT