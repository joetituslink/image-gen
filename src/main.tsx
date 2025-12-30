import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Check for required environment variables in production
if (import.meta.env.PROD) {
  const requiredVars = ["VITE_API_URL"];
  const missingVars = requiredVars.filter(
    (varName) => !import.meta.env[varName]
  );

  if (missingVars.length > 0) {
    const errorMessage = `FATAL ERROR: Missing required environment variables: ${missingVars.join(", ")}. 

If you just added a .env file on the server, you MUST run "npm run build" again because Vite embeds these variables into the code during the build process.`;
    console.error(errorMessage);
    // Display error on screen for easier debugging in production
    document.body.innerHTML = `<div style="padding: 20px; color: white; background: #991b1b; font-family: sans-serif;">
      <h1>Configuration Error</h1>
      <p style="white-space: pre-wrap;">${errorMessage}</p>
      <p>Current Mode: ${import.meta.env.MODE}</p>
    </div>`;
    throw new Error(errorMessage);
  }
}

createRoot(document.getElementById("root")!).render(<App />);
