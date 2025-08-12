import React from "react";
import { createRoot } from "react-dom/client";
import RealEstateSpainCalculator from "./RealEstateSpainCalculator.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RealEstateSpainCalculator />
  </React.StrictMode>
);
