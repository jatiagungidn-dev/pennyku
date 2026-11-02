import axios from "axios";
import { authClient } from "./auth-client";

const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
  throw new Error("Missing VITE_API_URL");
}

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const sessionResult = await authClient.getSession();
  const token = sessionResult?.data?.session?.token;

  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error;

    if (typeof message === "string") {
      return message;
    }

    return error.message || "Something went wrong";
  }

  return error instanceof Error
    ? error.message
    : "An unexpected error occurred";
}
