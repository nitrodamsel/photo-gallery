# 📸 Photo Gallery App

A full-featured photo gallery web application built with **Express.js**, **EJS**, and **SQLite**. Upload, tag, browse, and manage your photos with automatic EXIF data extraction and thumbnail generation.

---

## ✨ Features

- 🖼️ **Upload Photos** — Drag-and-drop or click-to-upload with size validation
- 🏷️ **Tag & Organize** — Add custom tags to photos and browse by category
- 🔍 **Search & Filter** — Full-text search and tag-based filtering
- 📊 **EXIF Data** — Automatic extraction of camera metadata
- 🖼️ **Thumbnails** — Automatic thumbnail generation with Sharp
- 🗄️ **SQLite Storage** — Lightweight, file-based database via Sequelize

---

## 🛠️ Prerequisites

- **Node.js** >= 18.x ([Download](https://nodejs.org/))
- **npm** >= 9.x (comes with Node.js)

---

## 🚀 Setup Instructions

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

The app will be available at **http://localhost:3000**

### 5. Production start

```bash
npm start
```

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
│   └── index.js        # Centralised config with validation
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
│   │   └── main.css    # Custom styles, gallery grid, tag badges
│   └── js/
│       └── main.js     # Client-side bootstrapper
└── uploads/            # User-uploaded files (gitignored)
```

---

## 🔗 API Endpoints

| Method | Path      | Description                     |
|--------|-----------|---------------------------------|
| GET    | `/`       | Home / landing page             |
| GET    | `/health` | Health-check — returns JSON     |

### Health Check Response

```json
{
  "status": "ok",
  "timestamp": "2026-06-19T12:00:00.000Z",
  "uptime": 42.5,
  "environment": "development"
}
```

---

## 📋 Available Scripts

| Script        | Command         | Description                        |
|---------------|-----------------|------------------------------------|
| `start`       | `npm start`     | Start the server (production)      |
| `dev`         | `npm run dev`   | Start with nodemon (auto-reload)   |
| `test`        | `npm test`      | Run tests                          |

---

## 🗺️ Phase Roadmap

| Phase | Description                                      | Status      |
|-------|--------------------------------------------------|-------------|
| 1     | Foundation & Project Scaffold                    | ✅ Complete |
| 2     | File Upload with Multer & Sharp Thumbnails       | 🔜 Planned  |
| 3     | SQLite Database & Sequelize Models               | 🔜 Planned  |
| 4     | Gallery Browsing & Filtering                     | 🔜 Planned  |
| 5     | Tag Management System                            | 🔜 Planned  |
| 6     | EXIF Data Extraction & Display                   | 🔜 Planned  |
| 7     | Search Functionality                             | 🔜 Planned  |
| 8     | UI Polish & Performance Optimisation             | 🔜 Planned  |

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