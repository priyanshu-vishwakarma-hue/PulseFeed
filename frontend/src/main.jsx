import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Provider } from "react-redux";
import store from "./utils/store.js";
import { ThemeProvider } from "./contexts/ThemeContext"; // Correct path

createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <ThemeProvider> {/* Wrap App in ThemeProvider */}
      <BrowserRouter>
        <App />
        <Toaster />
      </BrowserRouter>
    </ThemeProvider>
  </Provider>
);