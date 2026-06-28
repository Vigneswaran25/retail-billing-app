# RetailPro — Smart Retail Billing Software

A complete, modern retail billing, inventory management, and POS solution built with **React** (frontend), **Node.js/Express** (backend), and **PostgreSQL** (database). 

Features include inline cart editing, custom A4 multilingual (English/Tamil) receipts, and secure client-side deployment without exposing source code.

---

## 🚀 Development Setup (Local)

### Prerequisites
- Node.js v18+
- PostgreSQL v15+

### 1. Database Setup
Create a PostgreSQL database named `retail`:
```sql
CREATE DATABASE retail;
```

### 2. Backend Setup
```bash
cd server
npm install

# Configure environment variables
# Copy .env.example to .env and set your DB credentials
# DB_NAME=retail
# DB_PASSWORD=your_password

# Run initial migrations and seed (if needed)
npm run db:migrate

# Start the dev server
npm run dev
```
*(Server runs on `http://localhost:5000`)*

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```
*(Frontend runs on `http://localhost:5173`)*

---

## 📦 Building for Client Deployment

We use `pkg` to package the entire backend API into a single Windows `.exe` executable. The React frontend is built, minified, and bundled alongside it. **This completely protects your source code when deploying to clients.**

### One-Click Build
Run the provided build script from the root of the project:
```powershell
.\BUILD.bat
```
This script will automatically:
1. Build and minify the React frontend (`client/dist`).
2. Copy the frontend build to `server/public`.
3. Install production dependencies for the server.
4. Compile the Node.js server into a native Windows executable (`ayyanar-billing.exe`) using `pkg`.
5. Prepare a deployment folder at `dist-deploy/` with the `.exe`, static `public` folder, `.env`, and startup script.

---

## 🛠️ Client Deployment Guide

To install the software on a client's computer, you do **not** need Node.js. 

### Step 1: Transfer Files
Zip the `dist-deploy/` folder from your build and extract it on the client's PC (e.g., `C:\AyyanarBilling-Setup\`). 
The folder MUST contain:
```text
C:\AyyanarBilling-Setup\
 ├── public\               <-- Minified React frontend
 ├── ayyanar-billing.exe   <-- Compiled backend
 ├── .env                  <-- Configuration
 └── START-BILLING.bat     <-- Launch script
```

### Step 2: Install PostgreSQL
Install **PostgreSQL 16** on the client's PC.
Note the password you set for the default `postgres` user.

### Step 3: Configure `.env`
Open the `.env` file in the client's folder and set their specific database password:
```env
DB_PASSWORD=their_postgres_password
```

### Step 4: Run the Application
Double-click **`START-BILLING.bat`**. 
The software is equipped with an auto-setup module. On the very first launch, it will automatically:
- Create the `ayyanar_billing` database.
- Create all necessary tables.
- Seed the default admin user and store settings.

The client can then access the application at `http://localhost:5000`.

**Default Login:**
- **Username**: `admin`
- **Password**: `admin123`
