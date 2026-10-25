import app from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./config/db.js";

const port = env.PORT;

async function startServer() {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL Neon is connected");
    app.listen(port, () => {
      console.log(`PennyKu is listening on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

startServer();
