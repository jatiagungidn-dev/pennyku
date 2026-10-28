import { authClient } from "../auth-client";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await (authClient as any).getJWTToken?.();

  if (!token) {
    throw new Error("Sesi login tidak ditemukan. Silahkan login kembali.");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  const result: unknown = await response.json();

  if (!response.ok) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : "Permintaan ke server gagal";

    throw new Error(message);
  }

  return result as T;
}
