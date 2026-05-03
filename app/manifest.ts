import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AIニュース・ダイジェスト",
    short_name: "AI News",
    description: "1日2回(JST 6時・18時)に更新する、AI関連トピックの日本語ダイジェスト。",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf8f3",
    theme_color: "#d97706",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
