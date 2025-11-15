import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quadrant",
    short_name: "Quadrant",
    description:
      "Quadrant — живая карта навыков и карьерных треков для внутренних команд.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6fb",
    theme_color: "#f44336",
    icons: [
      {
        src: "/icons/icon-192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        src: "/icons/icon-512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
  };
}
