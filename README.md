# ⚡ TechWave Electronics

> Your one-stop destination for the latest electronics — smartphones, laptops, accessories, and more — with exclusive deals and fast delivery.

🌐 **Live Site:** [techwaveelectronics.co.ke](https://techwaveelectronics.co.ke)

---

## ✨ Features

### For Shoppers
- 🛍️ **Browse by Category** — Explore phones, laptops, gaming, audio, home appliances, and more
- 🔍 **Product Search & Filtering** — Quickly find what you're looking for
- 🛒 **Shopping Cart** — Add, update, and manage items seamlessly
- 💳 **M-PESA Integration** — Secure local payments via Daraja API
- 📱 **Responsive Design** — Fully optimized for mobile and desktop

### For Sellers
- 🏪 **Seller Portal** — Manage your product listings and track orders
- 📊 **Sales Dashboard** — Monitor performance and inventory

### For Admins
- 🔐 **Role-Based Access Control** — Separate permissions for admins, sellers, and customers
- 🗂️ **Category & Product Management** — Full CRUD control over the catalogue
- 👥 **User Management** — Oversee all registered accounts

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 19, TypeScript, Angular SSR |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Payments | M-PESA Daraja API |
| Process Manager | PM2 |
| Hosting | VPS (techwaveelectronics.co.ke) |

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js v18+
- MySQL 8+
- Angular CLI (`npm install -g @angular/cli`)
- A Safaricom Daraja API account (for M-PESA)

### 1. Clone the Repository

```bash
git clone https://github.com/JoshMith/Techwave-Frontend.git
cd Techwave-Frontend
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
PORT=3000
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=techwave_db

# M-PESA Daraja
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
```

Import the database schema:

```bash
mysql -u your_mysql_user -p techwave_db < database/schema.sql
```

Start the backend:

```bash
npm start
# or with PM2
pm2 start server.js --name techwave-backend
```

### 3. Frontend Setup

```bash
cd ../frontend
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
ng serve
```

The app will be available at `http://localhost:4200`.

### 4. Production Build (SSR)

```bash
ng build --configuration production
pm2 start dist/techwave/server/server.mjs --name techwave-frontend
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
- Follow the existing code style and Angular conventions
- Write clear, descriptive commit messages
- Test your changes before submitting
- Open an issue first for major changes to discuss the approach

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Josh** — Full-Stack Developer  
🎓 BSc Information Technology, Dedan Kimathi University of Technology  
🐙 GitHub: [@yourusername](https://github.com/yourusername)  
💼 LinkedIn: [your-linkedin](https://linkedin.com/in/your-linkedin)

---

<p align="center">Built with ❤️ for a seamless electronics shopping experience</p>