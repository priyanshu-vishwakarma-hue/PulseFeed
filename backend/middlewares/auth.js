const { verifyJWT } = require("../utils/generateToken");

const verifyUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Token missing" });
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyJWT(token);

  if (!decoded) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }

  req.user = decoded.id; // attach user ID
  next();
};

module.exports = verifyUser;
