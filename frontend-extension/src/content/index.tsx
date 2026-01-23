import React from "react";
import { createRoot } from "react-dom/client";
import { SidebarApp } from "./SidebarApp";
import styles from "../app/styles/index.css?inline";

// Inject the sidebar into the page
function injectSidebar() {
  // Create host container
  const hostDiv = document.createElement("div");
  hostDiv.id = "linq-ai-overlay";

  // Attach shadow DOM
  const shadowRoot = hostDiv.attachShadow({ mode: "open" });

  // Inject Tailwind CSS into shadow root
  const styleElement = document.createElement("style");
  styleElement.textContent = styles;
  shadowRoot.appendChild(styleElement);

  // Create root container inside shadow DOM
  const appContainer = document.createElement("div");
  appContainer.id = "linq-shadow-root";
  shadowRoot.appendChild(appContainer);

  // Append to document body
  document.body.appendChild(hostDiv);

  // Mount React app
  const root = createRoot(appContainer);
  root.render(
    <React.StrictMode>
      <SidebarApp />
    </React.StrictMode>
  );
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectSidebar);
} else {
  injectSidebar();
}
