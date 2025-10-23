import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { addSlectedBlog } from "../utils/selectedBlogSlice";
import { handleLikeBlog, handleSaveBlog } from "../utils/api";
import { openOnLoad } from "../utils/commentSlice";
import { formatDate } from "../utils/formatDate";

function BlogCard({ blog, setBlogs }) {
  const { token, id: userId } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const isLiked = blog.likes.includes(userId);
  const likesCount = blog.likes.length;
  const isSaved = blog.totalSaves.includes(userId);

  const handleLike = async (e) => {
    e.preventDefault();
    if (!token) return;
    const originalState = isLiked;
    
    setBlogs(prevBlogs => prevBlogs.map(b => {
      if (b._id === blog._id) {
        return {
          ...b,
          likes: originalState 
            ? b.likes.filter(id => id !== userId) // remove like
            : [...b.likes, userId] // add like
        };
      }
      return b;
    }));

    const success = await handleLikeBlog(blog._id, token);
    if (!success) {
      setBlogs(prevBlogs => prevBlogs.map(b => 
        b._id === blog._id ? blog : b // Revert to original blog prop
      ));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!token) return;
    const originalState = isSaved;

    setBlogs(prevBlogs => prevBlogs.map(b => {
        if (b._id === blog._id) {
            return {
                ...b,
                totalSaves: originalState
                    ? b.totalSaves.filter(id => id !== userId) // remove save
                    : [...b.totalSaves, userId] // add save
            };
        }
        return b;
    }));

    const success = await handleSaveBlog(blog._id, token);
    if (!success) {
      setBlogs(prevBlogs => prevBlogs.map(b => 
        b._id === blog._id ? blog : b // Revert to original blog prop
      ));
    }
  };

  const handleComment = (e) => {
    e.preventDefault();
    dispatch(addSlectedBlog(blog));
    dispatch(openOnLoad()); // Tell panel to open
    navigate(`/blog/${blog.blogId}`); // Navigate
  };

  return (
    // --- FIX: Use new theme colors for card ---
    <div className="w-full my-4 p-6 bg-white dark:bg-neutral-900 rounded-lg shadow-md border border-neutral-200 dark:border-neutral-800">
      {/* Author Info */}
      <Link 
        to={`/@${blog.creator.username}`} 
        onClick={(e) => e.stopPropagation()} 
        className="flex items-center gap-2 group mb-4"
      >
        <img
          src={
            blog?.creator?.profilePic ||
            `https://api.dicebear.com/9.x/initials/svg?seed=${blog?.creator?.name}`
          }
          alt={blog.creator.name}
          className="w-8 h-8 rounded-full object-cover"
        />
        <p className="font-medium text-sm text-neutral-900 dark:text-neutral-200 group-hover:underline">{blog?.creator?.name}</p>
        <span className="text-neutral-400 dark:text-neutral-600">·</span>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{formatDate(blog?.createdAt)}</p>
      </Link>

      {/* Main Content Link */}
      <Link to={"/blog/" + blog.blogId} className="flex justify-between gap-8 max-xsm:flex-col">
        <div className="flex-[2] flex flex-col gap-2">
          <h2 className="font-bold text-2xl text-neutral-900 dark:text-white leading-tight hover:underline">
            {blog?.title}
          </h2>
          <p className="line-clamp-2 text-neutral-600 dark:text-neutral-400 hidden sm:block">
            {blog?.description}
          </p>
        </div>
        <div className="flex-1 max-xsm:mt-4">
          <img
            src={blog?.image}
            alt={blog.title}
            className="aspect-video object-cover w-full rounded-lg border border-neutral-200 dark:border-neutral-800"
          />
        </div>
      </Link>

      {/* Action Bar - Below the link, preventing click bug */}
      <div className="flex justify-between items-center mt-6">
        <div className="flex gap-6">
          <button
            onClick={handleLike}
            className={`flex gap-2 items-center text-neutral-500 dark:text-neutral-400 hover:text-red-500 ${isLiked ? "text-red-500" : ""}`}
            disabled={!token}
          >
            <i className={`fi ${isLiked ? "fi-sr-heart" : "fi-rr-heart"} text-lg`}></i>
            <span className="text-sm font-medium">{likesCount}</span>
          </button>

          <button
            onClick={handleComment}
            className="flex gap-2 items-center text-neutral-500 dark:text-neutral-400 hover:text-primary-500"
          >
            <i className="fi fi-rr-comment-alt text-lg"></i>
            <span className="text-sm font-medium">{blog?.comments}</span>
          </button>

          <button
            onClick={handleSave}
            className={`flex gap-2 items-center text-neutral-500 dark:text-neutral-400 hover:text-primary-500 ${isSaved ? "text-primary-500" : ""}`}
            disabled={!token}
          >
            <i className={`fi ${isSaved ? "fi-sr-bookmark" : "fi-rr-bookmark"} text-lg`}></i>
          </button>
        </div>
      </div>
    </div>
  );
}

export default BlogCard;