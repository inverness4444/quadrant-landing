"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((error) => {
          if (process.env.NODE_ENV !== "production") {
            console.warn("SW registration failed", error);
          }
        });
    }
  }, []);
  return null;
}
