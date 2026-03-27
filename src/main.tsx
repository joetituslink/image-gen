import { createRoot } from "react-dom/client";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/roboto/latin-400.css";
import "@fontsource/roboto/latin-700.css";
import "@fontsource/open-sans/latin-400.css";
import "@fontsource/open-sans/latin-700.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/poppins/latin-400.css";
import "@fontsource/poppins/latin-700.css";
import "@fontsource/lora/latin-400.css";
import "@fontsource/lora/latin-700.css";
import "@fontsource/merriweather/latin-400.css";
import "@fontsource/merriweather/latin-700.css";
import "@fontsource/playfair-display/latin-400.css";
import "@fontsource/playfair-display/latin-700.css";
import "@fontsource/montserrat/latin-400.css";
import "@fontsource/montserrat/latin-700.css";
import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-700.css";
import App from "./App.tsx";
import "./index.css";

// Check for required environment variables in production
if (import.meta.env.PROD) {
  // We no longer strictly require VITE_API_URL because it defaults to "" (same origin)
  // in the components, which works perfectly when the backend serves the frontend.
  console.log("🚀 App running in production mode");
}

createRoot(document.getElementById("root")!).render(<App />);
