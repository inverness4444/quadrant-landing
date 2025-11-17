"use client";

export const CSRF_HEADER_NAME = "X-Quadrant-CSRF";

export function getCsrfTokenFromDocument() {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie.split(";").find((cookie) => cookie.trim().startsWith("quadrant_csrf="));
  if (!match) return null;
  return decodeURIComponent(match.split("=")[1]);
}

export function buildCsrfHeader(): Record<string, string> {
  const token = getCsrfTokenFromDocument();
  if (!token) return {};
  return { [CSRF_HEADER_NAME]: token };
}
