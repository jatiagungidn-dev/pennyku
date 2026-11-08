import { pool } from "../../config/db.js";

export async function create(
  userId: string,
  idempotency_key: string,
  request_hash: string,
) {
  const claimResult = await pool.query(
    `
        INSERT INTO idempotency_keys (
            user_id,
            idempotency_key,
            request_hash,
            expires_at
        )
        VALUES (
            $1,
            $2,
            $3,
            NOW() + INTERVAL '24 hours'
        )
        ON CONFLICT (user_id, idempotency_key)
        DO UPDATE SET
            request_hash = EXCLUDED.request_hash,
            response_status = NULL,
            response_body = NULL,
            created_at = NOW(),
            expires_at = NOW() + INTERVAL '24 hours'
        WHERE idempotency_key.expires_at <= NOW()
        RETURNING id
    `,
    [userId, idempotency_key, request_hash],
  );
}
