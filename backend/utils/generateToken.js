const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/dotenv.config");

function generateJWT(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" }); // token valid for 7 days
}

function verifyJWT(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return false;
  }
}

function decodeJWT(token) {
  return jwt.decode(token);
}

module.exports = { generateJWT, verifyJWT, decodeJWT };
