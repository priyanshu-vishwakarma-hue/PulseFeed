const rateLimit = require("express-rate-limit");
const {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  AUTH_RATE_LIMIT_MAX_REQUESTS,
  CHAT_RATE_LIMIT_MAX_REQUESTS,
} = require("../config/dotenv.config");

const windowMs = Number(RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

const standardHeaders = true;
const legacyHeaders = false;

const apiLimiter = rateLimit({
  windowMs,
  max: Number(RATE_LIMIT_MAX_REQUESTS) || 300,
  standardHeaders,
  legacyHeaders,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

const authLimiter = rateLimit({
  windowMs,
  max: Number(AUTH_RATE_LIMIT_MAX_REQUESTS) || 20,
  standardHeaders,
  legacyHeaders,
  message: {
    success: false,
    message: "Too many auth attempts. Please try again later.",
  },
});

const chatLimiter = rateLimit({
  windowMs,
  max: Number(CHAT_RATE_LIMIT_MAX_REQUESTS) || 240,
  standardHeaders,
  legacyHeaders,
  message: {
    success: false,
    message: "Too many chat requests. Please slow down.",
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  chatLimiter,
};
