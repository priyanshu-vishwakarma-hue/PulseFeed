import axios from "axios";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import {
  addSlectedBlog,
  changeLikes,
  removeSelectedBlog,
  setComments as setCommentsInStore,
} from "../utils/selectedBlogSlice";
import { formatDate } from "../utils/formatDate";
import { handleSaveBlog, handleFollowCreator, handleLikeBlog } from "../utils/api";
import Comment from "../components/Comment";
import { setIsOpen, openOnLoad } from "../utils/commentSlice";
import { toggleLikeBlogLocal, toggleSaveBlogLocal, removeBlogFromLists } from "../utils/userSilce";
import { useNavigate } from "react-router-dom";
import Avatar from "../components/Avatar";
import { getApiBaseUrl } from "../utils/network";

function BlogPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [isBlogSaved, setIsBlogSaved] = useState(false);
  const [islike, setIsLike] = useState(false);
  
  const { isOpen: isCommentPanelOpen, showOnLoad } = useSelector((state) => state.comment);

  const {
    token,
    email,
    id: userId,
    following,
  } = useSelector((state) => state.user);
  
  const blog = useSelector((state) => state.selectedBlog);

  const displayLikes = blog.likes || [];
  const displayComments = Array.isArray(blog.comments) ? blog.comments : [];
  const displayCreator = blog.creator || {};

  async function fetchBlogById() {
    try {
      let {
        data: { blog: fetchedBlog },
      } = await axios.get(`${getApiBaseUrl()}/blogs/${id}`);
      dispatch(addSlectedBlog(fetchedBlog));
      
      // Use the freshly fetched blog data to set the state
      setIsBlogSaved(fetchedBlog.totalSaves.includes(userId));
      setIsLike(fetchedBlog.likes.includes(userId));

          // If we were instructed to open on load (from another page) or there's a comment hash
      // make sure the comment panel opens. use `openOnLoad` (idempotent) instead of toggling.
      if (showOnLoad || (window.location.hash && window.location.hash.startsWith('#c-'))) {
        dispatch(openOnLoad());
      }

    } catch (error) {
      // If blog was deleted on server, make sure current user's local lists are cleaned up
      if (error.response?.status === 404) {
        dispatch(removeBlogFromLists(id));
        toast.error("Blog not found — removed from your saved/liked lists");
        navigate("/");
        return;
      }
      toast.error(error.response?.data?.message || "Failed to fetch blog");
    }
  }

  async function handleLike() {
    if (!token) return toast.error("Please signin to like this blog");
    
    const originalLikeState = islike;
    setIsLike((prev) => !prev); // Optimistic update
    dispatch(changeLikes(userId)); // Update Redux

    const success = await handleLikeBlog(blog._id, token);
    
    if (!success) {
      setIsLike(originalLikeState); // Revert
      dispatch(changeLikes(userId));
    } else {
      // update local user lists (keeps profile tabs in sync)
      dispatch(toggleLikeBlogLocal(blog._id));
    }
  }

  async function handleSave() {
    if (!token) return toast.error("Please sign in to save this blog");
    
    const originalSaveState = isBlogSaved;
    setIsBlogSaved((prev) => !prev);

    const success = await handleSaveBlog(blog._id, token);
    
    if (!success) {
      setIsBlogSaved(originalSaveState); // Revert
    } else {
      // update local user lists
      dispatch(toggleSaveBlogLocal(blog._id));
    }
  }

  async function handlePostComment(commentText) {
    if (!token) return toast.error("Please sign in to comment");
    if (!commentText.trim()) return toast.error("Comment cannot be empty");

    try {
      let res = await axios.post(
        `${getApiBaseUrl()}/blogs/comment/${blog._id}`,
        { comment: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      dispatch(setCommentsInStore(res.data.newComment));
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to post comment");
      return false;
    }
  }

  useEffect(() => {
    if (id) {
        fetchBlogById();
    }
    
    return () => {
      if (!window.location.pathname.startsWith(`/edit/`)) {
        dispatch(removeSelectedBlog());
      }
      dispatch(setIsOpen(false)); // Always close panel on unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userId]); // Re-run if id or userId changes

  if (!blog._id) {
    return (
      <div className="flex justify-center items-center w-full h-[calc(100vh-200px)]">
        <span className="loader"></span>
      </div>
    );
  }

  return (
    <>
    {/* --- FIX: Main wrapper for shifting content --- */}
    <div 
      className={`transition-all duration-300
                  ${isCommentPanelOpen ? 'sm:pr-[400px]' : 'pr-0'}`}
    >
      {/* --- FIX: Content is centered and wider --- */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <article className="bg-white dark:bg-neutral-900 rounded-lg p-4 sm:p-8 shadow-md border border-neutral-200 dark:border-neutral-800">
          <h1 className="mt-6 font-bold text-4xl sm:text-5xl leading-tight text-neutral-900 dark:text-white">
            {blog.title}
          </h1>
          
          <p className="text-xl text-neutral-600 dark:text-neutral-400 my-6 italic">
            {blog.description}
          </p>

          <div className="flex items-center my-8 gap-3">
            <Link to={`/@${displayCreator.username}`}>
              <Avatar name={displayCreator.name} src={displayCreator?.profilePic} alt={displayCreator.name} className="w-12 h-12 rounded-full object-cover" />
            </Link>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 ">
                <Link to={`/@${displayCreator.username}`}>
                  <h2 className="text-lg font-semibold hover:underline cursor-pointer dark:text-white">
                    {displayCreator.name}
                  </h2>
                </Link>
                {userId && userId !== displayCreator._id && (
                  <button
                    onClick={() =>
                      handleFollowCreator(displayCreator._id, token, dispatch)
                    }
                    className="ml-2 text-sm text-primary-600 font-semibold"
                  >
                    {following?.includes(displayCreator?._id)
                      ? "Following"
                      : "Follow"}
                  </button>
                )}
              </div>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">{formatDate(blog.createdAt)}</span>
            </div>
          </div>
          
          <div className="flex gap-8 items-center mt-4 border-y dark:border-neutral-700 py-4">
            <button
              onClick={handleLike}
              disabled={!token}
              className={`flex gap-2 items-center text-neutral-500 dark:text-neutral-400 ${islike ? "text-red-500 dark:text-red-500" : "hover:text-red-500"}`}
            >
              <i className={`fi ${islike ? "fi-sr-heart" : "fi-rr-heart"} text-2xl`}></i>
              <span className="text-lg font-medium">{displayLikes.length}</span>
            </button>

            <button
              onClick={() => dispatch(setIsOpen())}
              className="flex gap-2 items-center text-neutral-500 dark:text-neutral-400 hover:text-primary-500"
            >
              <i className="fi fi-rr-comment-alt text-2xl"></i>
              <span className="text-lg font-medium">{displayComments.length}</span>
            </button>
            
            <button
              onClick={handleSave}
              disabled={!token}
              className={`flex gap-2 items-center text-neutral-500 dark:text-neutral-400 ${isBlogSaved ? "text-primary-500 dark:text-primary-500" : "hover:text-primary-500"}`} 
            >
              <i className={`fi ${isBlogSaved ? "fi-sr-bookmark" : "fi-rr-bookmark"} text-2xl`}></i>
            </button>

            {token && email === displayCreator.email && (
              <Link to={"/edit/" + blog.blogId} className="ml-auto">
                <button className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-4 py-2 text-sm font-medium rounded-md">
                  Edit
                </button>
              </Link>
            )}
          </div>
          
          <img src={blog.image} alt={blog.title} className="w-full aspect-video object-cover rounded-lg my-8" />
          
          {/* --- FIX: Applied typography plugin class --- */}
          <div className="my-10 blog-content-display">
            {blog.content.blocks && blog.content.blocks.map((block, index) => {
              if (block.type === "header") {
                  const Tag = `h${block.data.level}`;
                  return <Tag key={index} dangerouslySetInnerHTML={{ __html: block.data.text }}></Tag>;
              } else if (block.type === "paragraph") {
                return <p key={index} dangerouslySetInnerHTML={{ __html: block.data.text }}></p>;
              } else if (block.type === "image") {
                return (
                  <div className="my-4" key={index}>
                    <img src={block.data.file.url} alt={block.data.caption || 'blog image'} className="rounded-md"/>
                    <p className="text-center my-2 text-sm text-neutral-500">{block.data.caption}</p>
                  </div>
                );
              } else if (block.type === "List") {
                const Tag = block.data.style === "ordered" ? "ol" : "ul";
                return (
                  <Tag key={index} className={block.data.style === "ordered" ? "list-decimal" : "list-disc"}>
                    {block.data.items.map((item, i) => (
                      <li key={i} dangerouslySetInnerHTML={{ __html: item }}></li>
                    ))}
                  </Tag>
                );
              }
              return null;
            })}
          </div>
        </article>
      </div>
    </div>
    
    {isCommentPanelOpen && <Comment onPostComment={handlePostComment} />}
    </>
  );
}

export default BlogPage;
