const express = require("express");
const cors = require("cors");
const dbConnect = require("./config/dbConnect");
const userRoute = require("./routes/userRoutes");
const blogRoute = require("./routes/blogRoutes");
const cloudinaryConfig = require("./config/cloudinaryConfig");
const { PORT, FRONTEND_URL } = require("./config/dotenv.config");

const app = express();

// JSON parsing
app.use(express.json());

// ===== Proper CORS =====
const corsOptions = {
  origin: FRONTEND_URL || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // Allow PATCH
  allowedHeaders: ["Content-Type", "Authorization"], // Allow token
  credentials: true,
};


// Start server
async function start() {
  try {
    await dbConnect();
    await cloudinaryConfig();

    const port = PORT || 3000;
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      console.log(`Frontend URL = ${FRONTEND_URL}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
