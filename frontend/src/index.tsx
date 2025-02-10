import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App"; // Import your main App

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

// Render your App component within the root.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
