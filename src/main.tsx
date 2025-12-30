import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Check for required environment variables in production
if (import.meta.env.PROD) {
  // We no longer strictly require VITE_API_URL because it defaults to "" (same origin)
  // in the components, which works perfectly when the backend serves the frontend.
  console.log("🚀 App running in production mode");
}

createRoot(document.getElementById("root")!).render(<App />);
