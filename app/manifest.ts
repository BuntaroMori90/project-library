import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/library",
    name: "Libronia",
    short_name: "Libronia",
    description: "La tua libreria personale di libri, manga e anime.",
    start_url: "/library",
    scope: "/",
    display: "standalone",
    background_color: "#0c0438",
    theme_color: "#0c0438",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/library-stories-v2-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/library-stories-v2-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/library-stories-v2-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
