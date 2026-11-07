# PennyKu

PennyKu adalah aplikasi **personal finance tracker** untuk membantu pengguna mengelola wallet serta mencatat pemasukan (_income_) dan pengeluaran (_expenses_) dalam satu tempat.

PennyKu dibangun menggunakan **React** dan **TypeScript** pada sisi frontend, serta **Express** dan **TypeScript** pada sisi backend. Data disimpan menggunakan **PostgreSQL**, sementara autentikasi ditangani oleh **Neon Auth**.

## Repository Structure

Repository PennyKu menggunakan pendekatan monorepo dengan npm workspaces.

```text
pennyku/
├── apps/
│   ├── web/                  # React + Vite frontend
│   └── api/                  # Express backend
│       └── database/
│           └── migrations/   # SQL migrations dan default category seed data
└── ...
```

Penjelasan setiap bagian:

- `apps/web` — React/Vite client yang mencakup authentication UI, dashboard, wallet management, dan transaction management.
- `apps/api` — Express API yang menangani authentication middleware, request validation, dan interaksi dengan PostgreSQL.
- `apps/api/database/migrations` — Kumpulan SQL migrations yang digunakan untuk mengelola database schema dan default category seed data.

## Requirements

Sebelum menjalankan PennyKu, pastikan environment sudah memiliki:

- **Node.js** dan **npm**. Project ini menggunakan npm workspaces.
- **PostgreSQL database** dengan konfigurasi schema yang sesuai dengan migrations di `apps/api/database/migrations`.
- **Neon Auth configuration** untuk frontend dan backend.

## Environment Configuration

Buat file environment sesuai kebutuhan masing-masing workspace. Jangan pernah memasukkan credentials asli ke dalam repository.

### Backend API

Salin `apps/api/.env.example` menjadi `apps/api/.env`, kemudian isi konfigurasi berikut:

| Variable             | Description                                                               |
| -------------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string.                                             |
| `NEON_AUTH_JWKS_URL` | JSON Web Key Set (JWKS) URL yang digunakan untuk memverifikasi API token. |
| `NEON_AUTH_ISSUER`   | Expected issuer dari authentication token.                                |
| `PORT`               | Port yang digunakan API. Default: `3000`.                                 |
| `NODE_ENV`           | Runtime environment. Default: `development`.                              |

### Frontend Web

Buat file `apps/web/.env`, kemudian konfigurasi variable berikut:

| Variable             | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| `VITE_API_URL`       | Base URL dari backend API, misalnya `http://localhost:3000`. |
| `VITE_NEON_AUTH_URL` | Neon Auth URL yang digunakan oleh frontend.                  |

## Installation

Clone repository, lalu jalankan perintah berikut dari repository root untuk menginstal seluruh dependencies:

```sh
npm install
```

## Database Migration

Setelah backend environment dikonfigurasi, jalankan database migrations:

```sh
npm run migrate
```

Perintah ini digunakan untuk menerapkan database schema dan migration yang tersedia.

## Running the Application

Jalankan kedua development servers dari repository root:

```sh
npm run dev
```

Secara default, backend API berjalan pada port `3000`, sedangkan Vite akan menampilkan URL frontend ketika development server dimulai.

Jika ingin menjalankan masing-masing workspace secara terpisah, gunakan:

**Backend API**

```sh
npm run dev:api
```

**Frontend Web**

```sh
npm run dev:web
```

## Available Scripts

Berikut beberapa perintah yang tersedia untuk memeriksa kualitas dan kondisi project.

### Root Scripts

Jalankan dari repository root:

| Command             | Description                                           |
| ------------------- | ----------------------------------------------------- |
| `npm run typecheck` | Memeriksa TypeScript types pada project.              |
| `npm test`          | Menjalankan API test suite menggunakan Vitest.        |
| `npm run migrate`   | Menjalankan database migrations.                      |
| `npm run dev`       | Menjalankan frontend dan backend development servers. |

### Frontend Scripts

Jalankan dari direktori `apps/web`:

| Command         | Description                                |
| --------------- | ------------------------------------------ |
| `npm run build` | Melakukan production build untuk frontend. |
| `npm run lint`  | Menjalankan linting pada frontend code.    |

## Testing

Backend API menggunakan **Vitest** sebagai testing framework.

Untuk menjalankan seluruh API test suite, gunakan:

```sh
npm test
```

Beberapa integration tests membutuhkan koneksi ke test database dan test user yang sudah dikonfigurasi.

Buat dan konfigurasi file `.env.test` sesuai kebutuhan yang dijelaskan di:

```text
apps/api/src/test/setup-env.ts
```

Pastikan test environment menggunakan database terpisah dari development maupun production database.

## API Overview

PennyKu menyediakan beberapa API endpoints untuk mengelola data aplikasi.

| Endpoint            | Description              | Authentication |
| ------------------- | ------------------------ | -------------- |
| `GET /`             | Public API health check. | Not required   |
| `/api/wallets`      | Wallet management.       | Required       |
| `/api/categories`   | Category management.     | Required       |
| `/api/transactions` | Transaction management.  | Required       |

Wallet, category, dan transaction endpoints memerlukan **Neon Auth Bearer Token**.

API menerapkan beberapa aturan akses data:

- Setiap wallet hanya dapat diakses oleh pemiliknya.
- Setiap transaction terhubung dengan wallet.
- Default categories dapat digunakan bersama oleh pengguna.
- Custom categories dapat dimiliki secara spesifik oleh masing-masing pengguna.

## Authentication

PennyKu menggunakan **Neon Auth** untuk menangani authentication.

Frontend menggunakan Neon Auth untuk proses autentikasi pengguna, sedangkan backend memverifikasi Bearer Token menggunakan konfigurasi JWKS dan expected issuer.

Endpoint yang membutuhkan autentikasi harus menyertakan token pada HTTP request header:

```http
Authorization: Bearer <access_token>
```
