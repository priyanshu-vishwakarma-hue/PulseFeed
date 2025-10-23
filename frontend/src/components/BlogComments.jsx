import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { formatDate } from "../utils/formatDate";
import toast from "react-hot-toast";
import axios from "axios";
// Import 'setComments' here for the parent component
import {
  setCommentLikes,
  setReplies,
  setUpdatedComments,
  deleteCommentAndReply,
  setComments, // <-- IMPORTED HERE
} from "../utils/selectedBlogSlice";

// This is the new component for showing comments on the home page
function BlogComments({ blog, onCommentAdded, onClose }) {
  const [comments, setCommentsList] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [commentText, setCommentText] = useState("");

  const { token, id: userId } = useSelector((state) => state.user);
  const { creator: { _id: creatorId } } = useSelector(state => state.selectedBlog);
  const dispatch = useDispatch();

  async function fetchComments() {
    if (!blog?._id || !hasMore) return;
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/blogs/${blog.blogId}/comments?page=${page}&limit=10`
      );
      setCommentsList((prev) => [...prev, ...data.comments]);
      setHasMore(data.hasMore);
      setPage((prev) => prev + 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch comments");
    }
  }

  async function handlePostComment() {
    if (!token) return toast.error("Please sign in to comment");
    if (!commentText.trim()) return toast.error("Comment cannot be empty");

    try {
      let res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/blogs/comment/${blog._id}`,
        { comment: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // --- FIX IS HERE ---
      // 1. Update local state for homepage UI
      setCommentsList((prev) => [res.data.newComment, ...prev]);
      // 2. Dispatch to update Redux store
      dispatch(setComments(res.data.newComment));
      // --- END FIX ---

      setCommentText("");
      onCommentAdded(); // Update comment count on blog card
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to post comment");
    }
  }

  useEffect(() => {
    // Reset state when blogId changes
    setCommentsList([]);
    setPage(1);
    setHasMore(true);
    if (blog?._id) {
      // Fetch first page
      (async () => {
        try {
          const { data } = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/blogs/${blog.blogId}/comments?page=1&limit=10`
          );
          setCommentsList(data.comments);
          setHasMore(data.hasMore);
          setPage(2);
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to fetch comments");
        }
      })();
    }
  }, [blog]);

  if (!blog) return null;

  return (
    <div className="w-full my-4 border-t pt-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Comments for &quot;{blog.title}&quot;</h2>
        <button onClick={onClose} className="text-2xl font-bold">&times;</button>
      </div>

      {token && (
        <div className="my-4">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="w-full p-2 border rounded-md resize-none"
            rows="3"
          />
          <button
            onClick={handlePostComment}
            className="bg-blue-500 text-white px-4 py-2 rounded-md mt-2"
          >
            Post Comment
          </button>
        </div>
      )}

      <div className="mt-4 space-y-4">
        <DisplayComments
          comments={comments}
          userId={userId}
          blogId={blog._id}
          token={token}
          creatorId={creatorId}
          dispatch={dispatch}
        />
      </div>

      {hasMore && (
        <button
          onClick={fetchComments}
          className="bg-gray-200 px-4 py-2 rounded-md mt-4"
        >
          Load More Comments
        </button>
      )}
    </div>
  );
}

// Reusable component for displaying comments and replies
export function DisplayComments({ comments, userId, blogId, token, creatorId, dispatch }) {
  const [activeReply, setActiveReply] = useState(null);
  const [showReplies, setShowReplies] = useState({});
  const [currentEditComment, setCurrentEditComment] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [updatedCommentContent, setUpdatedCommentContent] = useState("");

  const handleToggleReplies = (commentId) => {
    setShowReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  }

  const handleActiveReply = (id) => {
    if (!token) return toast.error("Please sign in to reply");
    setActiveReply((prev) => (prev === id ? null : id));
    setReplyText("");
  };

  const handlePostReply = async (parentCommentId) => {
    if (!token) return toast.error("Please sign in to reply");
    if (!replyText.trim()) return toast.error("Reply cannot be empty");

    try {
      let res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/comment/${parentCommentId}/${blogId}`,
        { reply: replyText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      dispatch(setReplies(res.data.newReply));
      setReplyText("");
      setActiveReply(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to post reply");
    }
  };

  const handleCommentLike = async (commentId) => {
    if (!token) return toast.error("Please sign in to like comments");
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/blogs/like-comment/${commentId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message);
      dispatch(setCommentLikes({ commentId, userId }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Like failed");
    }
  };

  const handleCommentUpdate = async (id) => {
    if (!token) return toast.error("Please sign in to edit");
    if (!updatedCommentContent.trim()) return toast.error("Comment cannot be empty");

    try {
      let res = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/blogs/edit-comment/${id}`,
        { updatedCommentContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message);
      dispatch(setUpdatedComments(res.data.updatedComment));
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setUpdatedCommentContent("");
      setCurrentEditComment(null);
    }
  };

  const handleCommentDelete = async (id) => {
    if (!token) return toast.error("Please sign in to delete");
    try {
      let res = await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/blogs/comment/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message);
      dispatch(deleteCommentAndReply(id));
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  return (
    <>
      {comments.map((comment) => (
        <div key={comment._id} className="border-b pb-2">
          <div className="flex flex-col gap-2 my-2">
            {currentEditComment === comment._id ? (
              <div className="my-2">
                <textarea
                  defaultValue={comment.comment}
                  className="w-full p-2 border rounded-md resize-none"
                  rows="3"
                  onChange={(e) => setUpdatedCommentContent(e.target.value)}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleCommentUpdate(comment._id)}
                    className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setCurrentEditComment(null)}
                    className="bg-gray-200 px-3 py-1 rounded-md text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex w-full justify-between">
                  <Link to={`/@${comment.user.username}`} className="flex gap-2 items-center">
                    <img
                      src={
                        comment.user?.profilePic ||
                        `https://api.dicebear.com/9.x/initials/svg?seed=${comment.user.name}`
                      }
                      alt={comment.user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <p className="capitalize font-medium text-sm">{comment.user.name}</p>
                      <p className="text-xs text-gray-500">{formatDate(comment.createdAt)}</p>
                    </div>
                  </Link>
                  
                  {(comment.user._id === userId || userId === creatorId) && (
                    <div className="relative group">
                        <i className="fi fi-bs-menu-dots cursor-pointer p-2"></i>
                        <div className="hidden group-hover:block bg-white border rounded-md shadow-lg absolute right-0 top-6 z-10 w-28">
                           {comment.user._id === userId && (
                             <p onClick={() => setCurrentEditComment(comment._id)} className="popup">Edit</p>
                           )}
                           <p onClick={() => handleCommentDelete(comment._id)} className="popup">Delete</p>
                        </div>
                    </div>
                  )}
                </div>

                <p className="font-medium text-gray-800">{comment.comment}</p>

                <div className="flex gap-4 items-center">
                  <div className="cursor-pointer flex gap-1 items-center text-gray-600">
                    <i
                      onClick={() => handleCommentLike(comment._id)}
                      className={`fi ${
                        comment.likes.includes(userId)
                          ? "fi-sr-thumbs-up text-blue-600"
                          : "fi-rr-social-network"
                      } text-lg`}
                    ></i>
                    <span className="text-sm">{comment.likes.length}</span>
                  </div>
                  <button
                    onClick={() => handleActiveReply(comment._id)}
                    className="text-sm text-gray-600 hover:underline"
                  >
                    Reply
                  </button>
                </div>
              </>
            )}

            {activeReply === comment._id && (
              <div className="my-2 pl-4">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full p-2 border rounded-md resize-none text-sm"
                  rows="2"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handlePostReply(comment._id)}
                    className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm"
                  >
                    Post Reply
                  </button>
                  <button
                    onClick={() => setActiveReply(null)}
                    className="bg-gray-200 px-3 py-1 rounded-md text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {comment.replies && comment.replies.length > 0 && (
              <div className="pl-6 border-l ml-4">
                <button
                    onClick={() => handleToggleReplies(comment._id)}
                    className="text-sm text-blue-600 hover:underline mb-2"
                >
                    {showReplies[comment._id] ? 'Hide' : `Show ${comment.replies.length} ${comment.replies.length > 1 ? 'Replies' : 'Reply'}`}
                </button>
                {showReplies[comment._id] && (
                    <DisplayComments
                      comments={comment.replies}
                      userId={userId}
                      blogId={blogId}
                      token={token}
                      creatorId={creatorId}
                      dispatch={dispatch}
                    />
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

export default BlogComments;