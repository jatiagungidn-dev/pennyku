# PennyKu

**PennyKu** adalah aplikasi personal finance management untuk membantu pengguna mengelola wallet serta mencatat pemasukan (_income_) dan pengeluaran (_expense_) dalam satu tempat.

Project ini dibangun menggunakan **Node.js, Express, TypeScript, dan PostgreSQL** pada sisi backend, serta **React dan TypeScript** pada sisi frontend. Authentication ditangani menggunakan **Neon Auth**.

## Fitur Utama

- **Authentication** - Autentikasi pengguna menggunakan Neon Auth dan token verification pada backend.
- **Wallet Management** - Membuat, melihat, memperbarui, dan menghapus wallet.
- **Transaction Management** - Mencatat, melihat, memperbarui, dan menghapus transaksi pemasukan maupun pengeluaran.
- **Category Management** - Menggunakan default categories dan membuat custom categories milik pengguna.
- **Transaction Summary** - Menampilkan ringkasan total income, expense, dan jumlah transaksi.
- **Pagination** - Mengambil daftar transaksi menggunakan page-based pagination.
- **Idempotent Transaction Creation** - Mencegah pembuatan transaksi duplikat ketika request dikirim ulang menggunakan idempotency key yang sama.
- **Database Transactions** - Menggunakan PostgreSQL transactions untuk menjaga konsistensi operasi yang melibatkan beberapa perubahan database.

## Tech Stack

| Area                 | Teknologi            |
| -------------------- | -------------------- |
| Backend Runtime      | Node.js              |
| Backend Framework    | Express              |
| Programming Language | TypeScript           |
| Database             | PostgreSQL           |
| Authentication       | Neon Auth            |
| Request Validation   | Zod                  |
| Database Client      | node-postgres (`pg`) |
| Logging              | Pino                 |
| Testing              | Vitest, Supertest    |
| Frontend             | React, Vite          |
| Monorepo             | npm Workspaces       |

## Arsitektur Backend

PennyKu menggunakan modular architecture dengan pemisahan tanggung jawab antara HTTP handling, business logic, dan database access.

```text
Client
  |
  v
Express Routes & Middleware
  |
  v
Controllers
  |
  v
Services
  |
  v
Repositories
  |
  v
PostgreSQL
```

### Struktur Backend

```text
apps/
└── api/
    ├── database/
    │   └── migrations/
    └── src/
        ├── config/
        ├── errors/
        ├── middlewares/
        ├── modules/
        │   ├── wallets/
        │   ├── categories/
        │   └── transactions/
        ├── test/
        └── types/
```

Setiap module memiliki tanggung jawab masing-masing dan menggunakan routes, controllers, services, repositories, serta validation schemas.

## Persiapan Project

### Prasyarat

Pastikan environment sudah memiliki:

- Node.js
- npm
- PostgreSQL database
- Neon Auth configuration

### 1. Clone Repository

```bash
git clone https://github.com/jatiagungidn-dev/pennyku
cd pennyku
```

### 2. Install Dependencies

Jalankan perintah berikut dari root repository:

```bash
npm install
```

### 3. Konfigurasi Environment Variables

Buat file `apps/api/.env` untuk backend:

```env
DATABASE_URL=your_postgresql_connection_string
NEON_AUTH_JWKS_URL=your_neon_auth_jwks_url
NEON_AUTH_ISSUER=your_neon_auth_issuer
PORT=3000
NODE_ENV=development
```

Buat file `apps/web/.env` untuk frontend:

```env
VITE_API_URL=http://localhost:3000
VITE_NEON_AUTH_URL=your_neon_auth_url
```

Jangan pernah memasukkan credentials atau secrets asli ke dalam repository.

### 4. Jalankan Database Migrations

```bash
npm run migrate
```

Perintah ini digunakan untuk menerapkan database migrations yang tersedia pada API workspace.

### 5. Jalankan Aplikasi

Untuk menjalankan frontend dan backend secara bersamaan:

```bash
npm run dev
```

Atau jalankan masing-masing workspace secara terpisah:

```bash
npm run dev:api
npm run dev:web
```

## API Overview

PennyKu menyediakan beberapa API resources untuk mengelola data aplikasi.

| Endpoint            | Operasi                                           |
| ------------------- | ------------------------------------------------- |
| `/api/wallets`      | Retrieve, create, update, dan delete wallets      |
| `/api/categories`   | Retrieve dan create categories                    |
| `/api/transactions` | Retrieve, create, update, dan delete transactions |

Seluruh endpoint `/api` memerlukan authentication menggunakan Neon Auth Bearer Token.

### Authentication

Sertakan access token pada HTTP request header:

```http
Authorization: Bearer <access_token>
```

Backend melakukan token verification menggunakan JWKS dan expected issuer yang dikonfigurasi melalui environment variables.

### Transaction Idempotency

Pembuatan transaksi memerlukan `Idempotency-Key` pada request header.

Contoh request:

```http
POST /api/transactions
Authorization: Bearer <access_token>
Idempotency-Key: <unique-request-key>
Content-Type: application/json
```

Backend menggunakan idempotency key dan request payload hash untuk menangani request yang dikirim ulang.

- Request ulang dengan key dan payload yang sama dapat menggunakan response yang sudah tersimpan.
- Penggunaan key yang sama dengan payload berbeda menghasilkan conflict response.
- Idempotency records memiliki masa berlaku selama 24 jam.

## Testing

Backend menggunakan **Vitest** dan **Supertest** untuk menjalankan API tests.

Jalankan seluruh API test suite dari root repository:

```bash
npm test
```

Untuk memeriksa TypeScript pada kedua workspace:

```bash
npm run typecheck
```

Beberapa integration tests memerlukan test database dan test user yang sudah dikonfigurasi.

## Available Scripts

### Root Repository

| Command             | Deskripsi                                 |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Menjalankan frontend dan backend          |
| `npm run dev:api`   | Menjalankan backend development server    |
| `npm run dev:web`   | Menjalankan frontend development server   |
| `npm run typecheck` | Memeriksa TypeScript pada kedua workspace |
| `npm test`          | Menjalankan backend test suite            |
| `npm run migrate`   | Menjalankan database migrations           |

### API Workspace

Jalankan dari direktori `apps/api`:

| Command             | Deskripsi                       |
| ------------------- | ------------------------------- |
| `npm run build`     | Compile backend                 |
| `npm run start`     | Menjalankan compiled backend    |
| `npm run typecheck` | Memeriksa TypeScript backend    |
| `npm run test`      | Menjalankan backend tests       |
| `npm run migrate`   | Menjalankan database migrations |

### Web Workspace

Jalankan dari direktori `apps/web`:

| Command             | Deskripsi                         |
| ------------------- | --------------------------------- |
| `npm run build`     | Membuat production build frontend |
| `npm run lint`      | Menjalankan frontend linting      |
| `npm run typecheck` | Memeriksa TypeScript frontend     |

## Tujuan Pengembangan

PennyKu juga menjadi project praktik untuk mempelajari dan menerapkan beberapa konsep backend engineering, seperti:

- REST API design
- Authentication dan authorization
- Relational database design
- SQL queries dan data aggregation
- Database transactions dan concurrency control
- Idempotent request handling
- API integration testing
- Database migrations

---

**Dibangun menggunakan Node.js, Express, TypeScript, dan PostgreSQL.**
