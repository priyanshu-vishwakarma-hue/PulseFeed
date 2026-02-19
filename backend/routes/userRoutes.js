const express = require("express");

const {
  createUser,
  getAllUsers,
  searchUsers,
  getUserById,
  updateUser,
  deleteUser,
  login,
  googleAuth,
  verifyEmail,
  followUser,
  changeSavedLikedBlog
} = require("../controllers/userController");
const verifyUser = require("../middlewares/auth");
const upload = require("../utils/multer");
const { authLimiter } = require("../middlewares/rateLimit");

const route = express.Router();

route.post("/signup", authLimiter, createUser);
route.post("/signin", authLimiter, login);

route.get("/users", getAllUsers);
route.get("/users-search", verifyUser, searchUsers);

route.get("/users/:username", getUserById);

// CHANGED: patch to put
route.put("/users/:id", verifyUser, upload.single("profilePic"), updateUser);

route.delete("/users/:id", verifyUser, deleteUser);

// verify email/token

route.get("/verify-email/:verificationToken", verifyEmail);

//google auth route
route.post("/google-auth", authLimiter, googleAuth);

// follow /unfollow
// CHANGED: patch to put
route.put("/follow/:id", verifyUser, followUser);

// CHANGED: patch to put
route.put("/change-saved-liked-blog-visibility" , verifyUser , changeSavedLikedBlog)

module.exports = route;
