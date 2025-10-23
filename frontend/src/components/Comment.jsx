import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setIsOpen } from "../utils/commentSlice";
import axios from "axios";
import {
  deleteCommentAndReply,
  setCommentLikes,
  setComments,
  setReplies,
  setUpdatedComments,
} from "../utils/selectedBlogSlice";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { formatDate } from "../utils/formatDate";

function Comment({ onPostComment }) {
  const dispatch = useDispatch();
  const [comment, setComment] = useState("");
  
  const {
    _id: blogId,
    comments,
    creator: { _id: creatorId },
  } = useSelector((state) => state.selectedBlog);
  
  const { token, id: userId, name, profilePic } = useSelector((state) => state.user);

  // Removed the scroll-lock useEffect

  const handleComment = async () => {
    let success = false;
    if (onPostComment) {
      success = await onPostComment(comment);
    } else {
      if (!token) return toast.error("Please signin to comment");
      if (!comment.trim()) return toast.error("Comment cannot be empty");
      try {
        let res = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/blogs/comment/${blogId}`,
          { comment },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        dispatch(setComments(res.data.newComment));
        success = true;
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to post comment");
      }
    }
    
    if (success) {
      setComment("");
    }
  };
  
  const commentsArray = Array.isArray(comments) ? comments : [];

  return (
    <>
      {/* --- FIX: Panel is now a fixed sidebar with flex-col --- */}
      <div 
        className="bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-xl
                   fixed top-16 right-0 h-[calc(100vh-4rem)] w-full sm:w-[400px] 
                   z-40 transition-transform duration-300
                   flex flex-col" // Added flex-col
        onClick={(e) => e.stopPropagation()}
      >
        {/* --- FIX: Sticky Header --- */}
        <div className="p-6 flex-shrink-0 flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Responses ({commentsArray.length})</h1>
          <button onClick={() => dispatch(setIsOpen(false))} className="text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white">
            <i className="fi fi-br-cross text-lg"></i>
          </button>
        </div>

        {/* --- FIX: Scrollable Content Area --- */}
        <div className="flex-1 overflow-y-auto p-6">
          {token && (
            <div className="my-4 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <img 
                  src={profilePic || `https://api.dicebear.com/9.x/initials/svg?seed=${name}`} 
                  alt={name} 
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm font-medium dark:text-white">{name}</span>
              </div>
              <textarea
                value={comment}
                type="text"
                placeholder="What are your thoughts?"
                className="w-full p-3 text-sm focus:outline-none border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800"
                rows="4"
                onChange={(e) => setComment(e.target.value)}
              />
              <button onClick={handleComment} className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-2 mt-3 rounded-full text-sm">
                Comment
              </button>
            </div>
          )}

          <div className="mt-8">
            <DisplayComments
              comments={commentsArray}
              userId={userId}
              blogId={blogId}
              token={token}
              creatorId={creatorId}
              dispatch={dispatch}
            />
          </div>
        </div>
      </div>
    </>
  );
}

// Reusable component for displaying comments and replies
function DisplayComments({ comments, userId, blogId, token, creatorId, dispatch }) {
  const [activeReply, setActiveReply] = useState(null);
  const [showReplies, setShowReplies] = useState({});
  const [currentEditComment, setCurrentEditComment] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [updatedCommentContent, setUpdatedCommentContent] = useState("");

  // ... (All handler functions remain the same) ...
  const handleToggleReplies = (commentId) => {
    setShowReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  }

  const handleActiveReply = (id) => {
    if (!token) return toast.error("Please sign in to reply");
    setActiveReply((prev) => (prev === id ? null : id));
    setReplyText("");
  };

  const handlePostReply = async (parentCommentId) => {
    if (!token || !replyText.trim()) return;
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
    if (!token) return toast.error("Please sign in to like");
    try {
      await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/blogs/like-comment/${commentId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      dispatch(setCommentLikes({ commentId, userId }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Like failed");
    }
  };

  const handleCommentUpdate = async (id) => {
    if (!token || !updatedCommentContent.trim()) return;
    try {
      let res = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/blogs/edit-comment/${id}`,
        { updatedCommentContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      dispatch(setUpdatedComments(res.data.updatedComment));
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setCurrentEditComment(null);
    }
  };

  const handleCommentDelete = async (id) => {
    if (!token) return;
    try {
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/blogs/comment/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      dispatch(deleteCommentAndReply(id));
      toast.success("Comment deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };


  return (
    <div className="space-y-6">
      {Array.isArray(comments) && comments.map((comment) => {
        const user = comment.user || { name: "Deleted User", username: "deleted", profilePic: "" };

        return (
          <div key={comment._id} className="pb-4 border-b border-neutral-200 dark:border-neutral-700 last:border-b-0">
            <div className="flex flex-col gap-2 my-2">
              {currentEditComment === comment._id ? (
                <div className="my-2">
                  <textarea
                    defaultValue={comment.comment}
                    className="w-full p-2 border rounded-md resize-none dark:bg-neutral-800 dark:border-neutral-700"
                    rows="3"
                    onChange={(e) => setUpdatedCommentContent(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleCommentUpdate(comment._id)} className="bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-medium">Save</button>
                    <button onClick={() => setCurrentEditComment(null)} className="bg-neutral-200 dark:bg-neutral-700 px-3 py-1 rounded-full text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex w-full justify-between">
                    <Link to={`/@${user.username}`} className="flex gap-2 items-center">
                      <img src={user.profilePic || `https://api.dicebear.com/9.x/initials/svg?seed=${user.name}`} alt={user.name} className="w-8 h-8 rounded-full object-cover"/>
                      <div>
                        <p className="capitalize font-medium text-sm dark:text-white">{user.name}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(comment.createdAt)}</p>
                      </div>
                    </Link>
                    
                    {(comment.user?._id === userId || userId === creatorId) && (
                      <div className="relative group">
                          <i className="fi fi-bs-menu-dots cursor-pointer p-2 text-neutral-500 dark:text-neutral-400"></i>
                          <div className="hidden group-hover:block bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-md shadow-lg absolute right-0 top-6 z-10 w-28 py-1">
                            {comment.user?._id === userId && (<p onClick={() => setCurrentEditComment(comment._id)} className="popup">Edit</p>)}
                            <p onClick={() => handleCommentDelete(comment._id)} className="popup text-red-600 dark:hover:bg-red-500/10">Delete</p>
                          </div>
                      </div>
                    )}
                  </div>

                  <p className="font-medium text-neutral-800 dark:text-neutral-300 py-2">{comment.comment}</p>

                  <div className="flex gap-4 items-center">
                    <div className="cursor-pointer flex gap-1 items-center text-neutral-500 dark:text-neutral-400">
                      <i onClick={() => handleCommentLike(comment._id)} className={`fi ${(comment.likes || []).includes(userId) ? "fi-sr-heart text-red-500" : "fi-rr-heart"} text-lg hover:text-red-500`}></i>
                      <span className="text-sm">{(comment.likes || []).length}</span>
                    </div>
                    <button onClick={() => handleActiveReply(comment._id)} className="text-sm text-neutral-500 dark:text-neutral-400 hover:underline">Reply</button>
                  </div>
                </>
              )}

              {activeReply === comment._id && (
                <div className="my-2 pl-10">
                  <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a reply..." className="w-full p-2 border rounded-md resize-none text-sm dark:bg-neutral-800 dark:border-neutral-700" rows="2"/>
                  <div className="flex gap-2 mt-2">
                    {/* --- THIS IS THE FIX --- */}
                    <button onClick={() => handlePostReply(comment._id)} className="bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-medium">Post Reply</button>
                    <button onClick={() => setActiveReply(null)} className="bg-neutral-200 dark:bg-neutral-700 px-3 py-1 rounded-full text-sm">Cancel</button>
                  </div>
                </div>
              )}

              {comment.replies && comment.replies.length > 0 && (
                <div className="pl-10 pt-4">
                  <button onClick={() => handleToggleReplies(comment._id)} className="text-sm text-primary-600 hover:underline mb-2 font-medium">
                      {showReplies[comment._id] ? 'Hide Replies' : `View ${comment.replies.length} ${comment.replies.length > 1 ? 'Replies' : 'Reply'}`}
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
        )
      })}
    </div>
  );
}

export default Comment;