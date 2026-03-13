import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

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

createRoot(document.getElementById("root")!).render(<App />);
