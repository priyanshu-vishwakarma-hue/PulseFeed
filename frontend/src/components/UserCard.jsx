import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { handleFollowCreator } from "../utils/api";

function UserCard({ user, onUserClick }) {
  const dispatch = useDispatch();
  const { 
    token, 
    id: currentUserId, 
    following 
  } = useSelector((state) => state.user);
  
  const isFollowing = following.includes(user._id);

  const handleFollowClick = (e) => {
    e.preventDefault(); // Prevent link navigation
    e.stopPropagation(); // Prevent modal close
    if (!token) return;
    handleFollowCreator(user._id, token, dispatch);
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <Link 
        to={`/@${user.username}`} 
        onClick={onUserClick} 
        className="flex items-center gap-3 group"
      >
        <img
          src={
            user.profilePic ||
            `https://api.dicebear.com/9.x/initials/svg?seed=${user.name}`
          }
          alt={user.name}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div>
          <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 group-hover:underline">
            {user.name}
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            @{user.username}
          </p>
        </div>
      </Link>

      {/* Show follow button only if it's not the current user */}
      {token && currentUserId !== user._id && (
        <button
          onClick={handleFollowClick}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
            isFollowing
              ? "bg-neutral-100 text-neutral-800 border border-neutral-300 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-700"
              : "bg-primary-600 text-white hover:bg-primary-700"
          }`}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>
      )}
    </div>
  );
}

export default UserCard;