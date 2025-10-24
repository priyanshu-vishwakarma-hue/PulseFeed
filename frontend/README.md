# PulseFeed - Full-Stack MERN Blog Platform

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x+-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

A modern, feature-rich blogging application built with the MERN stack (MongoDB, Express.js, React, Node.js), featuring a block-style editor, robust authentication, social interactions, and cloud image hosting.


## ✨ Key Features

* **Authentication:**
    * Secure Email/Password signup with email verification (Nodemailer).
    * Google OAuth 2.0 integration via Firebase Authentication.
    * JWT (JSON Web Token) for session management.
* **Blog Post Management (CRUD):**
    * Create, Read, Update, and Delete blog posts.
    * **Rich Block-Style Editor:** Powered by Editor.js, supporting headings, lists (nested), images, embeds, markers, and underlines.
    * **Cloud Image Uploads:** Seamless integration with Cloudinary for cover images and inline content images.
    * **Draft & Publish System:** Save posts as drafts or publish them publicly.
    * **Tagging System:** Categorize posts with tags for better discovery.
* **User Profiles:**
    * Dedicated profile pages (`/@username`).
    * Editable profile information (name, username, bio, profile picture).
    * Cloudinary integration for profile picture uploads and removal.
    * Display user's posts, liked posts, saved posts, and drafts (if viewing own profile).
    * Configurable visibility for liked/saved posts sections.
* **Social Interactions:**
    * Follow/Unfollow other users.
    * Like/Unlike blog posts.
    * Save/Unsave (Bookmark) blog posts.
    * **Nested Commenting System:** Engage in discussions with threaded replies on posts.
    * Like/Unlike comments.
    * Edit/Delete own comments.
* **Discovery:**
    * Homepage feed displaying the latest posts with pagination.
    * Search functionality by keywords (title/description).
    * Browse posts by specific tags.
* **Modern UI/UX:**
    * Responsive design using Tailwind CSS.
    * Light/Dark mode toggle with theme persistence (`localStorage`).
    * User-friendly notifications via React Hot Toast.
    * Optimistic UI updates for like/save actions.
    * Slide-out panel for comments.
    * Modals for follower/following lists.

---

## 🚀 Technology Stack

**Frontend:**
* **Framework:** React 18
* **Routing:** React Router DOM v6
* **State Management:** Redux Toolkit (RTK)
* **Styling:** Tailwind CSS v3 (with Typography plugin), PostCSS, Autoprefixer
* **HTTP Client:** Axios
* **Editor:** Editor.js
* **Authentication:** Firebase (Client SDK for Google Auth)
* **UI/UX:** React Hot Toast, Flaticon Uicons
* **Build Tool:** Vite

**Backend:**
* **Framework:** Express.js
* **Database:** MongoDB (with Mongoose ODM)
* **Authentication:** JWT (jsonwebtoken), Firebase Admin SDK (for Google token verification), Bcrypt (password hashing)
* **Image Hosting:** Cloudinary
* **File Uploads:** Multer
* **Email Service:** Nodemailer
* **Environment Variables:** dotenv
* **Other:** CORS, Short Unique ID

---

## 🔧 Getting Started

### Prerequisites

* Node.js (v18.x or higher recommended)
* npm or yarn
* MongoDB instance (local or cloud like MongoDB Atlas)
* Cloudinary Account (for image uploads)
* Firebase Project (for Google Authentication)
* Email Service Account (like Gmail with App Password, or a transactional email service like SendGrid/Mailgun for Nodemailer)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
    cd your-repo-name
    ```

2.  **Backend Setup:**
    ```bash
    cd backend
    npm install
    ```
    * Create a `.env` file in the `backend` directory.
    * Copy the contents of `.env.examples` into `.env`.
    * Fill in your specific credentials for:
        * `PORT` (e.g., 3000)
        * `DB_URL` (your MongoDB connection string)
        * Cloudinary credentials (`CLOUDINARY_...`)
        * `JWT_SECRET` (a strong, random secret key)
        * Nodemailer credentials (`EMAIL_...`)
        * Firebase Admin SDK credentials (can be obtained from your Firebase project settings - **Important:** Format the `FIREBASE_PRIVATE_KEY` correctly, often needs `\n` preserved)
        * `FRONTEND_URL` (URL where your frontend will run, e.g., `http://localhost:5173`)

3.  **Frontend Setup:**
    ```bash
    cd ../frontend
    npm install
    ```
    * Create a `.env` file in the `frontend` directory.
    * Copy the contents of `.env.examples` into `.env`.
    * Fill in your specific credentials for:
        * `VITE_BACKEND_URL` (URL where your backend is running, e.g., `http://localhost:3000/api/v1`)
        * Firebase Client SDK credentials (`VITE_APIKEY`, `VITE_AUTHDOMAIN`, etc. - obtained from your Firebase project web app settings)

### Running the Application

1.  **Start the Backend Server:**
    ```bash
    cd backend
    npm run dev  # For development with nodemon
    # or
    # npm start    # For production
    ```

2.  **Start the Frontend Development Server:**
    ```bash
    cd frontend
    npm run dev
    ```

Open your browser and navigate to `http://localhost:5173` (or your configured frontend port).

---

## ⚙️ Environment Variables

Ensure you have `.env` files in both the `frontend` and `backend` directories, populated with the necessary credentials as described in the `.env.examples` files. **Never commit your `.env` files to version control.**

* **Backend (`backend/.env`):** Database connection, Cloudinary keys, JWT secret, Firebase Admin keys, Nodemailer settings, Frontend URL.
* **Frontend (`frontend/.env`):** Backend API endpoint, Firebase client keys.

---

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 📧 Contact

[Your Name] - [your.email@example.com]

Project Link: [https://github.com/your-username/your-repo-name](https://github.com/your-username/your-repo-name)

LinkedIn (Optional): [Your LinkedIn Profile URL]