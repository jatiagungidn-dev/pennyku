import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthReactAdapter } from "@neondatabase/auth/react/adapters";

const authURL = import.meta.env.VITE_NEON_AUTH_URL;

if (!authURL) {
  throw new Error("Missing VITE_NEON_AUTH_URL");
}

export const authClient = createAuthClient(authURL, {
  adapter: BetterAuthReactAdapter(),
});
