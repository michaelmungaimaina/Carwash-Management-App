# Carwash Management System

A full-stack **Carwash & Carpet Management System** with **Android (Java + XML)** client and **Node.js + PostgreSQL** backend.  
Offline-first with **Room DB**, auto-sync, role-based access, inventory, payments (Cash, M-Pesa STK, Card), and multi-branch support.

---

## 🚀 Features
- Car Registry with attendant & payment tracking (cash, M-Pesa, card, or combined).
- Carpet Client Registry: clients, deposits, balances.
- Carpet Registry: carpet details, status tracking.
- Inventory: categories, items, stock levels, reorder alerts.
- Daily Usage: record item usage per subsidiary (Carwash, Carpet).
- Branch Management: multi-branch support.
- User Management: authentication, roles, permissions.
- Offline-first: Room DB caching + auto-sync with WorkManager.
- M-Pesa Daraja API integration (STK push + callback).

---

## 📱 Android App (Java + XML)
- Offline-first storage with Room DB.
- Auto-sync with backend via WorkManager.
- Secure login with role-based access.
- Session control (restricted to approved devices).

---

## 🌐 Backend (Node.js + PostgreSQL)
- REST API for all entities.
- Delta sync endpoints for offline-first data sync.
- M-Pesa STK push + callback integration.
- Secure user authentication with JWT.
- PostgreSQL migrations and indexes.

---

## ⚡ Installation

### 1. Clone repository
```bash
git clone https://github.com/michaelmungaimaina/Carwash-Management-App.git
cd Carwash-Management-App
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env   # configure DB & MPESA credentials
npm run migrate
npm start
```

### 3. Android App Setup
- Open `android/` folder in **Android Studio**.
- Update `BASE_URL` in `ApiService.java`.
- Build & run.

---

## 🔑 Environment Variables (Backend)
```env
DATABASE_URL=postgres://user:password@localhost:5432/carwash
JWT_SECRET=your_jwt_secret
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/mpesa/callback
```

---

## 🗄️ Database Schema
- CarRegistry ↔ Payments (1:N)
- CarpetClient ↔ CarpetRegistry (1:N)
- Category ↔ Item (1:N)
- Branch ↔ all entities (1:N)
- Users: authentication + references

---

## 🧩 Roadmap
- [ ] Push notifications for completed services.
- [ ] Multi-branch dashboard in Android app.
- [ ] Advanced reporting (sales, usage, revenue per branch).
- [ ] Data export (Excel/PDF).

---

## 👥 Contributors
- **You** – Android Development (Java + XML)
- **Backend Dev** – Node.js + PostgreSQL + M-Pesa integration
