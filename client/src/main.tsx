import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import OCIDProvider from "./utils/OCIDProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <OCIDProvider>
      <App />
    </OCIDProvider>
  </React.StrictMode>
);
