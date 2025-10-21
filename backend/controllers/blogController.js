const Blog = require("../models/blogSchema");
const Comment = require("../models/commentSchema");
const User = require("../models/userSchema");
const ShortUniqueId = require("short-unique-id");
const { randomUUID } = new ShortUniqueId({ length: 10 });
const {
  uploadImage,
  deleteImagefromCloudinary,
} = require("../utils/uploadImage");

// Helper function to recursively populate replies
async function populateReplies(comments) {
  for (const comment of comments) {
    if (comment.replies && comment.replies.length > 0) {
      const populatedReplies = await Comment.find({ '_id': { $in: comment.replies } })
        .populate('user', 'name username profilePic')
        .sort({ createdAt: -1 })
        .lean();
      comment.replies = populatedReplies;
      await populateReplies(comment.replies);
    }
  }
  return comments;
}

// ... (createBlog function remains the same as before) ...
async function createBlog(req, res) {
  try {
    const creator = req.user;
    const { title, description, content: contentJSON, tags: tagsJSON, draft: draftString } = req.body;
    const draft = draftString === "true";
    const { image, images } = req.files;

    const content = JSON.parse(contentJSON);
    const tags = JSON.parse(tagsJSON);

    if (!title || !description || !content || !image) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Handle content images
    let imageIndex = 0;
    if (content.blocks && images && images.length > 0) {
      for (let i = 0; i < content.blocks.length; i++) {
        const block = content.blocks[i];
        if (block.type === "image") {
          if (images[imageIndex]) {
            const { secure_url, public_id } = await uploadImage(
              `data:image/jpeg;base64,${images[imageIndex].buffer.toString("base64")}`
            );
            block.data.file = { url: secure_url, imageId: public_id };
            imageIndex++;
          }
        }
      }
    }

    // Handle cover image
    const { secure_url, public_id } = await uploadImage(
      `data:image/jpeg;base64,${image[0].buffer.toString("base64")}`
    );

    const blogId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + "-" + randomUUID();

    const blog = await Blog.create({
      description,
      title,
      draft,
      creator,
      image: secure_url,
      imageId: public_id,
      blogId,
      content,
      tags,
    });

    await User.findByIdAndUpdate(creator, { $push: { blogs: blog._id } });

    res.status(201).json({
      message: draft ? "Blog saved as draft" : "Blog created successfully",
      blog,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
}

// --- THIS IS THE FIX ---
async function getBlogs(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const blogs = await Blog.find({ draft: false })
      .populate({
        path: "creator",
        select: "name username profilePic",
      })
      .populate("comments") // Keep this to get the count
      // REMOVED: .populate("likes")
      // REMOVED: .populate("totalSaves")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // .lean() will convert the ObjectId arrays (likes, totalSaves) to string arrays

    const totalBlogs = await Blog.countDocuments({ draft: false });

    return res.status(200).json({
      message: "Blogs fetched Successfully",
      // Map to send full data, but replace comments array with its length
      blogs: blogs.map(blog => ({ 
        ...blog, 
        comments: blog.comments.length // Send only comment length
        // `likes` and `totalSaves` are now correctly string arrays from .lean()
      })),
      hasMore: skip + limit < totalBlogs,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
}

// --- FIXED getBlog ---
async function getBlog(req, res) {
    try {
        const { blogId } = req.params;
        const blog = await Blog.findOne({ blogId })
            .populate({
                path: 'creator',
                select: 'name email followers username profilePic',
            })
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'name username profilePic',
                },
                options: { sort: { createdAt: -1 } },
            })
            .lean(); // .lean() converts likes/totalSaves to string arrays
  
        if (!blog) {
            return res.status(404).json({ message: 'Blog Not found' });
        }
  
        // Recursively populate replies
        if (blog.comments && blog.comments.length > 0) {
            blog.comments = await populateReplies(blog.comments);
        }
  
        return res.status(200).json({
            message: 'Blog fetched Successfully',
            blog,
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
  }

// --- FIXED getBlogComments ---
async function getBlogComments(req, res) {
  try {
    const { blogId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const blog = await Blog.findOne({ blogId }).select("comments");
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    const comments = await Comment.find({ _id: { $in: blog.comments }, parentComment: null })
      .populate({
        path: "user",
        select: "name username profilePic",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const populatedComments = await populateReplies(comments);
    const totalComments = await Comment.countDocuments({ _id: { $in: blog.comments }, parentComment: null });

    return res.status(200).json({
      message: "Comments fetched successfully",
      comments: populatedComments,
      hasMore: skip + limit < totalComments,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
}

// ... (updateBlog, deleteBlog remain the same as previous correct version) ...
async function updateBlog(req, res) {
    try {
      const creator = req.user;
      const { id } = req.params; // This is blogId
      const { title, description, content: contentJSON, tags: tagsJSON, draft: draftString, existingImages: existingImagesJSON } = req.body;
  
      const draft = draftString === "true";
      const content = JSON.parse(contentJSON);
      const tags = JSON.parse(tagsJSON);
      const existingImages = JSON.parse(existingImagesJSON || "[]");
  
      const blog = await Blog.findOne({ blogId: id });
  
      if (!blog) {
        return res.status(404).json({ message: "Blog is not found" });
      }
  
      if (String(creator) !== String(blog.creator)) {
        return res.status(403).json({ message: "You are not authorized for this action" });
      }
  
      // Delete images removed from content
      let imagesToDelete = [];
      if (blog.content && blog.content.blocks) {
        imagesToDelete = blog.content.blocks
          .filter(block => block.type === 'image' && block.data.file.imageId)
          .filter(block => !existingImages.find(({ url }) => url === block.data.file.url))
          .map(block => block.data.file.imageId);
      }
      if (imagesToDelete.length > 0) {
        await Promise.all(imagesToDelete.map(id => deleteImagefromCloudinary(id)));
      }
  
      // Upload new images from content
      if (req.files.images) {
        let imageIndex = 0;
        if (content.blocks) {
          for (let i = 0; i < content.blocks.length; i++) {
            const block = content.blocks[i];
            if (block.type === "image" && block.data.file.image) { // 'image' flag is set by frontend
              const { secure_url, public_id } = await uploadImage(
                `data:image/jpeg;base64,${req.files.images[imageIndex].buffer.toString("base64")}`
              );
              block.data.file = { url: secure_url, imageId: public_id };
              imageIndex++;
            }
          }
        }
      }
  
      // Update cover image if a new one was provided
      if (req.files.image) {
        await deleteImagefromCloudinary(blog.imageId);
        const { secure_url, public_id } = await uploadImage(
          `data:image/jpeg;base64,${req.files.image[0].buffer.toString("base64")}`
        );
        blog.image = secure_url;
        blog.imageId = public_id;
      }
  
      // Update fields
      blog.title = title || blog.title;
      blog.description = description || blog.description;
      blog.draft = draft;
      blog.content = content || blog.content;
      blog.tags = tags || blog.tags;
  
      await blog.save();
  
      return res.status(200).json({
        success: true,
        message: "Blog updated successfully",
        blog,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        message: error.message,
      });
    }
}

async function deleteBlog(req, res) {
    try {
      const creator = req.user;
      const { id } = req.params; // This should be _id
  
      const blog = await Blog.findById(id);
  
      if (!blog) {
        return res.status(404).json({ message: "Blog is not found" });
      }
  
      if (String(creator) !== String(blog.creator)) {
        return res.status(403).json({ message: "You are not authorized for this action" });
      }
  
      // Delete content images
      if (blog.content && blog.content.blocks) {
        const imagesToDelete = blog.content.blocks
          .filter(block => block.type === 'image' && block.data.file.imageId)
          .map(block => block.data.file.imageId);
          
        if (imagesToDelete.length > 0) {
          await Promise.all(imagesToDelete.map(id => deleteImagefromCloudinary(id)));
        }
      }
  
      // Delete cover image
      await deleteImagefromCloudinary(blog.imageId);
  
      // Delete blog and remove from user's blogs array
      await Blog.findByIdAndDelete(id);
      await User.findByIdAndUpdate(creator, { $pull: { blogs: id } });
  
      // Also remove from all users' saveBlogs and likeBlogs arrays
      await User.updateMany(
        { $or: [{ saveBlogs: id }, { likeBlogs: id }] },
        { $pull: { saveBlogs: id, likeBlogs: id } }
      );
  
      // Delete all associated comments
      await Comment.deleteMany({ _id: { $in: blog.comments } });
  
      return res.status(200).json({
        success: true,
        message: "Blog deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
}

// --- THIS FUNCTION IS FIXED (MESSAGES SWAPPED) ---
async function likeBlog(req, res) {
    try {
      const user = req.user;
      const { id } = req.params; // blog _id
  
      const blog = await Blog.findById(id);
  
      if (!blog) {
        return res.status(404).json({ message: "Blog is not found" });
      }
  
      if (!blog.likes.includes(user)) {
        // User is LIKING the blog
        await Blog.findByIdAndUpdate(id, { $push: { likes: user } });
        await User.findByIdAndUpdate(user, { $push: { likeBlogs: id } });
        return res.status(200).json({
          success: true,
          message: "Blog Liked successfully", // Correct message
        });
      } else {
        // User is DISLIKING the blog
        await Blog.findByIdAndUpdate(id, { $pull: { likes: user } });
        await User.findByIdAndUpdate(user, { $pull: { likeBlogs: id } });
        return res.status(200).json({
          success: true,
          message: "Blog DisLiked successfully", // Correct message
        });
      }
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
}

// --- THIS FUNCTION IS FIXED (MESSAGES SWAPPED) ---
async function saveBlog(req, res) {
    try {
      const user = req.user;
      const { id } = req.params; // blog _id
  
      const blog = await Blog.findById(id);
  
      if (!blog) {
        return res.status(404).json({ message: "Blog is not found" });
      }
  
      if (!blog.totalSaves.includes(user)) {
        // User is SAVING the blog
        await Blog.findByIdAndUpdate(id, { $push: { totalSaves: user } });
        await User.findByIdAndUpdate(user, { $push: { saveBlogs: id } });
        return res.status(200).json({
          success: true,
          message: "Blog has been saved", // Correct message
        });
      } else {
        // User is UNSAVING the blog
        await Blog.findByIdAndUpdate(id, { $pull: { totalSaves: user } });
        await User.findByIdAndUpdate(user, { $pull: { saveBlogs: id } });
        return res.status(200).json({
          success: true,
          message: "Blog Unsaved", // Correct message
        });
      }
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
}

// --- THIS IS THE 2ND FIX ---
async function searchBlogs(req, res) {
    try {
      const { search, tag } = req.query;
  
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const skip = (page - 1) * limit;
  
      let query = { draft: false };
  
      if (tag) {
        query.tags = tag;
      } else if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }
  
      const blogs = await Blog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "creator",
          select: "name username profilePic",
        })
        .populate("comments")
        // REMOVED: .populate("likes")
        // REMOVED: .populate("totalSaves")
        .lean(); // .lean() will convert ObjectId arrays to strings
  
      if (blogs.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No blogs found. Try different keywords.",
          hasMore: false,
        });
      }
  
      const totalBlogs = await Blog.countDocuments(query);
  
      return res.status(200).json({
        success: true,
        blogs: blogs.map(blog => ({ 
          ...blog, 
          comments: blog.comments.length 
        })),
        hasMore: skip + limit < totalBlogs,
      });
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
}

module.exports = {
  createBlog,
  deleteBlog,
  getBlog,
  getBlogs,
  getBlogComments,
  updateBlog,
  likeBlog,
  saveBlog,
  searchBlogs,
};