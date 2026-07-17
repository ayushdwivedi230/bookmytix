# 🎬 BookMyTix

A modern full-stack movie ticket booking platform inspired by BookMyShow. Users can browse movies, select theatres and showtimes, reserve seats, and securely book tickets through an intuitive and responsive interface.

## 🚀 Live Demo

🌐 https://bookmytix-de36.onrender.com

## 📸 Screenshots

> Add screenshots here

- Home Page
- Movie Details
- Theatre Selection
- Seat Selection
- Booking Confirmation

---

## ✨ Features

### User Features

- User Authentication (JWT)
- Sign Up & Login
- Browse Movies
- View Movie Details
- Search Movies
- Browse Theatres
- View Show Timings
- Interactive Seat Selection
- Book Movie Tickets
- Booking Confirmation
- Responsive Design

### Admin Features

- Manage Movies
- Manage Theatres
- Manage Shows
- Update Seat Availability

---

## 🛠 Tech Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- Axios

### Backend

- Node.js
- Express.js
- TypeScript
- JWT Authentication
- REST APIs

### Database

- PostgreSQL
- Drizzle ORM

### Deployment

- Render
- Neon PostgreSQL

---

## 📂 Project Structure

```
BookMyTix
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   └── utils/
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── db/
│   ├── schema/
│   └── utils/
│
└── README.md
```

---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/ayushdwivedi230/bookmytix.git
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run dev
```

---

## 🔑 Environment Variables

Create a `.env` file in the backend directory.

```env
DATABASE_URL=your_database_url

JWT_SECRET=your_secret_key

PORT=5000
```

---

## 📡 API Overview

### Authentication

- POST /api/auth/register
- POST /api/auth/login

### Movies

- GET /api/movies
- GET /api/movies/:id

### Theatres

- GET /api/theatres

### Shows

- GET /api/shows

### Booking

- POST /api/bookings

---

## 🔒 Security

- JWT Authentication
- Password Hashing
- Protected Routes
- Input Validation

---

## 🎯 Future Improvements

- Online Payment Integration
- Email Ticket Confirmation
- QR Code Tickets
- Admin Dashboard
- Movie Reviews
- Ratings
- Wishlist
- Recommendation System

---

## 📈 Learning Outcomes

This project helped me strengthen my understanding of:

- Full Stack Development
- REST API Design
- Authentication & Authorization
- PostgreSQL Database Design
- Drizzle ORM
- React State Management
- Deployment on Render
- Production Environment Variables

---

## 👨‍💻 Author

**Ayush Dwivedi**

GitHub: https://github.com/ayushdwivedi230

LinkedIn: https://linkedin.com/in/ayush-dwivedi

---

## ⭐ Support

If you like this project, consider giving it a ⭐ on GitHub.
