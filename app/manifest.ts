import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Decide.",
    short_name: "Decide.",
    description: "Stop overthinking. Simple decision maker.",
    start_url: "/",
    display: "standalone", // This hides the browser URL bar when launched
    background_color: "#5a595f", // Matches your app background
    theme_color: "#5a595f", // Matches your top status bar
    icons: [
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
