# ⚡ TechWave Electronics Kenya

> Your one-stop destination for the latest electronics — smartphones, laptops, accessories, and more — with exclusive deals and fast delivery across Kenya.

🌐 **Live Site:** [techwaveelectronics.co.ke](https://techwaveelectronics.co.ke)

---

## ✨ Features

### For Shoppers
- 🛍️ **Browse by Category** — Explore phones, laptops, gaming, audio, home appliances, accessories, and more
- 🔍 **Product Search & Filtering** — Quickly find what you're looking for with price, brand, and category filters
- 🛒 **Shopping Cart** — Add, update, and manage items seamlessly; guest cart merges on login
- 💳 **M-PESA Integration** — Secure local payments via Safaricom Daraja API (STK Push)
- 📦 **Order Tracking** — View order history and status updates in your account
- ⭐ **Product Reviews** — Submit verified reviews after confirmed delivery
- 📱 **Responsive Design** — Fully optimised for mobile and desktop

### For Sales Agents
- 🔗 **Agent Portal** — Dedicated login and dashboard for authorised sales agents
- 📊 **Commission Dashboard** — Track referred orders and earned commissions in real time
- 🤝 **Referral Links** — Unique agent referral links for session-based order attribution

### For Admins
- 🔐 **Role-Based Access Control** — Separate scoped permissions for admins, agents, and customers
- 🗂️ **Product Management** — Full CRUD control over the catalogue with image upload and specs
- 📦 **Order Management** — Update order statuses, confirm COD payments, view order details
- 👥 **Customer Management** — View customer profiles and full order history
- 🤝 **Agent Management** — Create agent accounts, issue referral links, run commission reports
- 🏷️ **Offers & Promotions** — Set sale prices and manage sitewide special offers

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 19, TypeScript, Angular SSR |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL |
| Payments | M-PESA Daraja API (STK Push) |
| Web Server | Nginx (reverse proxy + SSL) |
| Process Manager | PM2 |
| Image Storage | Local VPS (`/public/uploads/products`) |
| Hosting | Ubuntu VPS (techwaveelectronics.co.ke) |

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js v18+
- PostgreSQL 14+
- Angular CLI (`npm install -g @angular/cli`)
- A Safaricom Daraja API account (for M-PESA payments)

### 1. Clone the Repository

```bash
git clone https://github.com/JoshMith/Techwave-Frontend.git
cd Techwave-Frontend
```

### 2. Backend Setup

```bash
cd Techwave-backend
npm install
```

Create a `.env` file in the `Techwave-backend/` directory:

```env
PORT=3000
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_pg_user
DB_PASSWORD=your_pg_password
DB_NAME=techwavedb

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Session / Cookies
COOKIE_SAME_SITE=lax
FRONTEND_URL=http://localhost:4200

# M-PESA Daraja
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=your_till_number
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
```

Import the database schema:

```bash
psql -U your_pg_user -d techwavedb -f Database/techwave.sql
```

Start the backend:

```bash
npm run dev
# or with PM2 in production
pm2 start dist/server.js --name techwave-backend
```

### 3. Frontend Setup

```bash
cd ../Techwave-frontend
npm install
```

Update the API base URL in `environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000'
};
```

Run the development server:

```bash
npm run start
```

The app will be available at `http://localhost:4200`.

### 4. Production Build (SSR)

```bash
npm run build
pm2 start dist/techwave/server/server.mjs --name techwave-frontend
```

---

## 📁 Project Structure

```
Techwave_V1.1/
├── Techwave-backend/
│   ├── src/
│   │   ├── config/          # DB config
│   │   ├── controllers/     # Route handlers
│   │   ├── middlewares/     # Auth, error handling
│   │   ├── routes/          # Express routers
│   │   └── services/        # Business logic (referral, commissions)
│   ├── public/uploads/      # Product images (local storage)
│   └── server.ts
└── Techwave-frontend/
    └── src/app/
        ├── admin/           # Admin portal (products, orders, agents, etc.)
        ├── agent/           # Agent portal (dashboard, orders, commissions)
        ├── categories/      # Per-category product pages
        ├── legal/           # Privacy Policy, Terms, Refund, Cookie Policy
        ├── product/         # Product detail page
        ├── services/        # API, cart, product services
        └── shared/          # Header, footer components
```

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit** your changes
   ```bash
   git commit -m "feat: add your feature description"
   ```
4. **Push** to your branch
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request** — describe what you've changed and why

### Guidelines
- Follow the existing code style and Angular/TypeScript conventions
- Write clear, descriptive commit messages (conventional commits preferred)
- Test your changes before submitting
- Open an issue first for major changes to discuss the approach

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Josh Mithamo** — Full-Stack Developer  
🎓 BSc Information Technology, Dedan Kimathi University of Technology  
🐙 GitHub: [@JoshMith](https://github.com/JoshMith)  
💼 LinkedIn: [Joshua Mithamo](https://linkedin.com/in/joshua-mithamo-505591330)

---