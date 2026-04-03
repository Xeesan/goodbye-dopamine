import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Guard: don't register SW in iframe/preview contexts to avoid cache issues
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  // Unregister any existing service workers in preview/iframe contexts
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
} else {
  const updateSW = registerSW({
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent("sw-update-available"));
    },
    onOfflineReady() {
      console.log("App ready for offline use");
    },
  });

  setInterval(() => updateSW(false), 60 * 1000);
  (window as any).__updateSW = updateSW;
}

createRoot(document.getElementById("root")!).render(<App />);
