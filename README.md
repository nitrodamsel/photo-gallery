# PhotoGallery

A full-featured photo gallery web application built with **Node.js**, **Express**, and **EJS**. Upload photos, organise them with custom tags, and explore rich EXIF metadata — all in a clean, responsive UI.

---

## ✨ Features (Roadmap)

| Phase | Description | Status |
|-------|-------------|--------|
| **1** | Foundation & project scaffold | ✅ Complete |
| **2** | Image upload & processing (Sharp, Multer) | 🔜 Planned |
| **3** | Gallery view with masonry grid | 🔜 Planned |
| **4** | Tagging system & filter UI | 🔜 Planned |
| **5** | EXIF metadata extraction & display | 🔜 Planned |
| **6** | Search & advanced filtering | 🔜 Planned |

---

## 🛠 Prerequisites

- **Node.js** >= 18  
- **npm** >= 9

---

## 🚀 Setup & Running Locally

```bash
# 1. Clone the repository
git clone https://github.com/your-username/photo-gallery.git
cd photo-gallery

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
#    Edit .env as needed (defaults work out of the box for local dev)

# 4. Start the development server (with hot-reload via nodemon)
npm run dev
```

The app will be available at **http://localhost:3000**.

---

## 📁 Project Structure

```
photo-gallery/
├── app.js                  # Express app factory
├── server.js               # Entry point — calls app.listen
├── .env                    # Local environment config (git-ignored)
├── .env.example            # Environment variable template
├── config/
│   └── index.js            # Centralised config with validation
├── routes/
│   └── index.js            # Root router (GET /, GET /health)
├── middleware/             # Custom Express middleware (future phases)
├── views/
│   ├── home.ejs            # Landing page
│   ├── error.ejs           # Error page
│   ├── layouts/
│   │   └── base.ejs        # Base HTML shell
│   └── partials/
│       └── navbar.ejs      # Navigation bar
├── public/
│   ├── css/main.css        # Custom styles & CSS variables
│   └── js/main.js          # Client-side JS bootstrapper
└── uploads/                # Uploaded images (git-ignored)
```

---

## 🔌 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Landing / home page |
| `GET` | `/health` | Health-check — returns JSON status |

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Web framework | [Express.js](https://expressjs.com/) |
| Templating | [EJS](https://ejs.co/) |
| Styling | [Bootstrap 5](https://getbootstrap.com/) + custom CSS |
| Image processing | [Sharp](https://sharp.pixelplumbing.com/) *(Phase 2)* |
| EXIF extraction | [exifr](https://github.com/MikeKovarik/exifr) *(Phase 5)* |
| ORM / Database | [Sequelize](https://sequelize.org/) + SQLite *(Phase 2)* |
| File uploads | [Multer](https://github.com/expressjs/multer) *(Phase 2)* |
| Dev server | [nodemon](https://nodemon.io/) |
| Config | [dotenv](https://github.com/motdotla/dotenv) |

---

## 📝 Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `npm start` | Run in production mode |
| `dev` | `npm run dev` | Run with nodemon (hot-reload) |
| `test` | `npm test` | Run test suite *(placeholder)* |

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.