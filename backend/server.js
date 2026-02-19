const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const { Server } = require("socket.io");
const dbConnect = require("./config/dbConnect");
const userRoute = require("./routes/userRoutes");
const blogRoute = require("./routes/blogRoutes");
const chatRoute = require("./routes/chatRoutes");
const cloudinaryConfig = require("./config/cloudinaryConfig");
const { apiLimiter } = require("./middlewares/rateLimit");
const setupChatSocket = require("./socket/chatSocket");
const {
  PORT,
  FRONTEND_URL,
  SOCKET_CORS_ORIGIN,
  BODY_LIMIT,
} = require("./config/dotenv.config");

const app = express();
const server = http.createServer(app);

function parseOrigins(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

const frontendOrigins = parseOrigins(FRONTEND_URL);
if (frontendOrigins.length === 0) {
  frontendOrigins.push("http://localhost:5173");
}
const socketOrigins = parseOrigins(SOCKET_CORS_ORIGIN || FRONTEND_URL);
const allowedOrigins = [...new Set([...frontendOrigins, ...socketOrigins])];

function corsOriginValidator(origin, callback) {
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  return callback(new Error("CORS origin not allowed"));
}

const corsOptions = {
  origin: corsOriginValidator,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.set("trust proxy", 1);
app.use(
  helmet({
    hsts: process.env.NODE_ENV === "production",
    crossOriginResourcePolicy: false,
  })
);
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: BODY_LIMIT || "200kb" }));
app.use(apiLimiter);

app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.send("Server running");
});

app.use("/api/v1", userRoute);
app.use("/api/v1", blogRoute);
app.use("/api/v1", chatRoute);

const io = new Server(server, {
  cors: {
    origin: corsOriginValidator,
    methods: ["GET", "POST"],
    credentials: true,
  },
});
app.set("io", io);
setupChatSocket(io);

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

async function start() {
  try {
    await dbConnect();
    await cloudinaryConfig();

    const port = PORT || 3000;
    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      console.log(`Allowed origins = ${allowedOrigins.join(", ") || "(none configured)"}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
