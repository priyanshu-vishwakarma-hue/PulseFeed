const User = require("../models/userSchema");
const bcrypt = require("bcrypt");
const { generateJWT, verifyJWT } = require("../utils/generateToken");
const sendMail = require("../utils/transporter");
const ShortUniqueId = require("short-unique-id");
const { randomUUID } = new ShortUniqueId({ length: 5 });
const admin = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");
const {
  deleteImagefromCloudinary,
  uploadImage,
} = require("../utils/uploadImage");
const {
  FIREBASE_TYPE,
  FIREBASE_PROJECT_ID,
  FIREBASE_PRIVATE_KEY_ID,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_CLIENT_ID,
  FIREBASE_AUTH_URI,
  FIREBASE_TOKEN_URI,
  FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  FIREBASE_CLIENT_X509_CERT_URL,
  FIREBASE_UNIVERSAL_DOMAIN,
  EMAIL_USER,
  FRONTEND_URL,
} = require("../config/dotenv.config");

// Initialization (check if already initialized)
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: FIREBASE_TYPE,
      project_id: FIREBASE_PROJECT_ID,
      private_key_id: FIREBASE_PRIVATE_KEY_ID,
      private_key: FIREBASE_PRIVATE_KEY,
      client_email: FIREBASE_CLIENT_EMAIL,
      client_id: FIREBASE_CLIENT_ID,
      auth_uri: FIREBASE_AUTH_URI,
      token_uri: FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: FIREBASE_CLIENT_X509_CERT_URL,
      universe_domain: FIREBASE_UNIVERSAL_DOMAIN,
    }),
  });
}


async function createUser(req, res) {
  const { name, password, email } = req.body;

  try {
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Please enter the name",
      });
    }
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Please enter the password",
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please enter the email",
      });
    }

    const checkForexistingUser = await User.findOne({ email });

    if (checkForexistingUser) {
      if (checkForexistingUser.googleAuth) {
        return res.status(400).json({
          success: true,
          message:
            "This email already registered with google. please try through continue with google",
        });
      }
      if (checkForexistingUser.isVerify) {
        return res.status(400).json({
          success: false,
          message: "User already registered with this email",
        });
      } else {
        let verificationToken = await generateJWT({
          email: checkForexistingUser.email,
          id: checkForexistingUser._id,
        });

        await sendMail({
          to: checkForexistingUser.email,
          subject: "Email Verification",
          text: "Please verify your email",
          html: `<h1>Click on the link to verify your email</h1>
              <a href="${FRONTEND_URL}/verify-email/${verificationToken}">Verify Email</a>`,
        });

        return res.status(200).json({
          success: true,
          message: "Please Check Your Email to verify your account",
        });
      }
    }

    const hashedPass = await bcrypt.hash(password, 10);
    const username = email.split("@")[0] + randomUUID();

    const newUser = await User.create({
      name,
      email,
      password: hashedPass,
      username,
    });

    let verificationToken = await generateJWT({
      email: newUser.email,
      id: newUser._id,
    });

    await sendMail({
      to: email,
      subject: "Email Verification",
      text: "Please verify your email",
      html: `<h1>Click on the link to verify your email</h1>
      <a href="${FRONTEND_URL}/verify-email/${verificationToken}">Verify Email</a>`,
    });

    return res.status(200).json({
      success: true,
      message: "Please Check Your Email to verify your account",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Please try again",
      error: err.message,
    });
  }
}

async function verifyEmail(req, res) {
  try {
    const { verificationToken } = req.params;

    const verifyToken = await verifyJWT(verificationToken);

    if (!verifyToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid Token/Email expired",
      });
    }
    const { id } = verifyToken;
    const user = await User.findByIdAndUpdate(
      id,
      { isVerify: true },
      { new: true }
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not exist",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Please try again",
      error: error.message,
    });
  }
}

async function googleAuth(req, res) {
  try {
    const { accessToken } = req.body;

    const response = await getAuth().verifyIdToken(accessToken);

    const { name, email } = response;

    let user = await User.findOne({ email });

    if (user) {
      // already registered
      if (user.googleAuth) {
        let token = await generateJWT({
          email: user.email,
          id: user._id,
        });

        return res.status(200).json({
          success: true,
          message: "logged in successfully",
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            profilePic: user.profilePic,
            username: user.username,
            showLikedBlogs: user.showLikedBlogs,
            showSavedBlogs: user.showSavedBlogs,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            token,
          },
        });
      } else {
        return res.status(400).json({
          success: true,
          message:
            "This email already registered without google. please try through login form",
        });
      }
    }
    const username = email.split("@")[0] + randomUUID();

    let newUser = await User.create({
      name,
      email,
      googleAuth: true,
      isVerify: true,
      username,
    });

    let token = await generateJWT({
      email: newUser.email,
      id: newUser._id,
    });

    return res.status(200).json({
      success: true,
      message: "Registration in successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        profilePic: newUser.profilePic,
        username: newUser.username,
        showLikedBlogs: newUser.showLikedBlogs,
        showSavedBlogs: newUser.showSavedBlogs,
        bio: newUser.bio,
        followers: newUser.followers,
        following: newUser.following,
        token,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Please try again",
      error: error.message,
    });
  }
}

async function login(req, res) {
  const { password, email } = req.body;

  try {
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Please enter the password",
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please enter the email",
      });
    }

    const checkForexistingUser = await User.findOne({ email }).select(
      "password isVerify name email profilePic username bio showLikedBlogs showSavedBlogs followers following googleAuth"
    );

    if (!checkForexistingUser) {
      return res.status(400).json({
        success: false,
        message: "User not exist",
      });
    }

    if (checkForexistingUser.googleAuth) {
      return res.status(400).json({
        success: true,
        message:
          "This email already registered with google. please try through continue with google",
      });
    }

    let checkForPass = await bcrypt.compare(
      password,
      checkForexistingUser.password
    );
    console.log(checkForPass)
    if (!checkForPass) {
      return res.status(400).json({
        success: false,
        message: "Incorrect password",
      });
    }

    if (!checkForexistingUser.isVerify) {
      let verificationToken = await generateJWT({
        email: checkForexistingUser.email,
        id: checkForexistingUser._id,
      });

      await sendMail({
        to: checkForexistingUser.email,
        subject: "Email Verification",
        text: "Please verify your email",
        html: `<h1>Click on the link to verify your email</h1>
        <a href="${FRONTEND_URL}/verify-email/${verificationToken}">Verify Email</a>`,
      });

      return res.status(400).json({
        success: false,
        message: "Please verify you email",
      });
    }

    let token = await generateJWT({
      email: checkForexistingUser.email,
      id: checkForexistingUser._id,
    });

    return res.status(200).json({
      success: true,
      message: "logged in successfully",
      user: {
        id: checkForexistingUser._id,
        name: checkForexistingUser.name,
        email: checkForexistingUser.email,
        profilePic: checkForexistingUser.profilePic,
        username: checkForexistingUser.username,
        bio: checkForexistingUser.bio,
        showLikedBlogs: checkForexistingUser.showLikedBlogs,
        showSavedBlogs: checkForexistingUser.showSavedBlogs,
        followers: checkForexistingUser.followers,
        following: checkForexistingUser.following,
        token,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Please try again",
      error: err.message,
    });
  }
}

async function getAllUsers(req, res) {
  try {
    const users = await User.find({});

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      users,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Please try again",
      error: err.message,
    });
  }
}

// --- THIS IS THE FIX ---
async function getUserById(req, res) {
  try {
    const username = req.params.username;

    const user = await User.findOne({ username })
      .populate({
        path: "followers following",
        select: "name username profilePic",
      })
      .populate({
        path: "blogs likeBlogs saveBlogs", // Populate all three blog lists
        populate: [ // Nested populate for each blog in those lists
          {
            path: "creator",
            select: "name username profilePic",
          },
          {
            path: "comments",
            select: "_id", // We just need the count
          },
          {
            path: "likes", // Populate likes
            select: "_id", // We ONLY select the _id
          },
          {
            path: "totalSaves", // Populate saves
            select: "_id", // We ONLY select the _id
          },
        ],
      })
      .select("-password -isVerify -__v -email -googleAuth")
      .lean(); // Use .lean() for a plain object

    if (!user) {
      return res.status(404).json({ // Return 404 for not found
        success: false,
        message: "User not found",
      });
    }
    
    // Transform blogs to have counts and simple string arrays for likes/saves
    const transformBlog = (blog) => {
        if (!blog || typeof blog !== 'object') return blog;
        
        // Mongoose .populate().lean() with select: '_id' gives [{_id: '...'}].
        // We must map this to just ['...']
        const likes = Array.isArray(blog.likes) ? blog.likes.map(item => item._id.toString()) : [];
        const totalSaves = Array.isArray(blog.totalSaves) ? blog.totalSaves.map(item => item._id.toString()) : [];
        const comments = Array.isArray(blog.comments) ? blog.comments.length : 0;
        
        return {
            ...blog,
            comments,
            likes,
            totalSaves,
        };
    };

    // Transform all blog arrays
    user.blogs = Array.isArray(user.blogs) ? user.blogs.map(transformBlog) : [];
    user.likeBlogs = Array.isArray(user.likeBlogs) ? user.likeBlogs.map(transformBlog) : [];
    user.saveBlogs = Array.isArray(user.saveBlogs) ? user.saveBlogs.map(transformBlog) : [];
    // --- END FIX ---

    return res.status(200).json({
      success: true,
      message: "User fetched successfully",
      user,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Please try again",
      error: err.message,
    });
  }
}

async function updateUser(req, res) {
  try {
    // db call
    const id = req.params.id;
    const loggedInUserId = req.user; // Get ID from verifyUser middleware

    // --- FIX: Check authorization ---
    if (id !== loggedInUserId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this profile.",
      });
    }

    const { name, username, bio } = req.body;
    const image = req.file;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Handle Profile Pic removal
    if (req.body.profilePic === 'null') { // Check for explicit removal signal
      if (user.profilePicId) {
        await deleteImagefromCloudinary(user.profilePicId);
      }
      user.profilePic = null;
      user.profilePicId = null;
    } 
    // Handle new Profile Pic upload
    else if (image) {
      if (user.profilePicId) { // Delete old pic if it exists
        await deleteImagefromCloudinary(user.profilePicId);
      }
      const { secure_url, public_id } = await uploadImage(
        `data:image/jpeg;base64,${image.buffer.toString("base64")}`
      );
      user.profilePic = secure_url;
      user.profilePicId = public_id;
    }
    // Else: no image file and no 'null' signal, so do nothing to the picture.


    if (user.username !== username) {
      const findUser = await User.findOne({ username });

      if (findUser) {
        return res.status(400).json({
          success: false,
          message: "Username already taken",
        });
      }
      user.username = username;
    }

    user.bio = bio || ""; // Ensure bio can be set to empty string
    user.name = name;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: {
        name: user.name,
        profilePic: user.profilePic,
        bio: user.bio,
        username: user.username,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Please try again",
      error: err.message
    });
  }
}

async function deleteUser(req, res) {
  try {
    const id = req.params.id;
    const loggedInUserId = req.user;

    // --- FIX: Check authorization ---
    if (id !== loggedInUserId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this profile.",
      });
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ // 404 for not found
        success: false,
        message: "User not found",
      });
    }

    // Add logic here to delete user's blogs, comments, etc. if needed

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
      deletedUser,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Please try again",
      error: err.message,
    });
  }
}

async function followUser(req, res) {
  try {
    const followerId = req.user; // ID of the user who is clicking "follow"
    const { id } = req.params; // ID of the user to be followed

    // --- FIX: Prevent self-follow ---
    if (followerId === id) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself."
      });
    }

    const userToFollow = await User.findById(id);
    const follower = await User.findById(followerId);

    if (!userToFollow || !follower) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    
    // Check if already following
    if (!userToFollow.followers.includes(followerId)) {
      // Not following: Add to both users' arrays
      await User.findByIdAndUpdate(id, { $push: { followers: followerId } });
      await User.findByIdAndUpdate(followerId, { $push: { following: id } });
      
      return res.status(200).json({
        success: true,
        message: "Follow",
      });
    } else {
      // Already following: Remove from both users' arrays
      await User.findByIdAndUpdate(id, { $pull: { followers: followerId } });
      await User.findByIdAndUpdate(followerId, { $pull: { following: id } });
      
      return res.status(200).json({
        success: true,
        message: "Unfollow",
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
}
async function changeSavedLikedBlog(req, res) {
  try {
    const userId = req.user;
    const { showLikedBlogs, showSavedBlogs } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ // 404 for not found
        message: "User is not found",
      });
    }

    await User.findByIdAndUpdate(userId, { showSavedBlogs, showLikedBlogs });

    return res.status(200).json({
      success: true,
      message: "Visibilty updated",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
}

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  login,
  verifyEmail,
  googleAuth,
  followUser,
  changeSavedLikedBlog,
};