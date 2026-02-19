import axios from "axios";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, Navigate, useLocation, useParams, useNavigate } from "react-router-dom";
import { handleFollowCreator } from "../utils/api";
import { useSelector, useDispatch } from "react-redux";
import DisplayBlogs from "../components/DisplayBlogs";
import { addSlectedBlog } from "../utils/selectedBlogSlice";
import { openOnLoad } from "../utils/commentSlice";
import FollowListModal from "../components/FollowListModal"; // <-- IMPORT MODAL
import Avatar from "../components/Avatar";
import { getApiBaseUrl } from "../utils/network";

function ProfilePage() {
  const { username } = useParams();
  const [userData, setUserData] = useState(null);
  const { token, id: userId, following } = useSelector((state) => state.user);
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // --- FIX: Add state for the modal ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState([]);

  const handleCommentClick = (blog) => {
    dispatch(addSlectedBlog(blog));
    dispatch(openOnLoad()); // Tell comment slice to open on load
    navigate(`/blog/${blog.blogId}`);
  };

  const getActiveTabClass = (path) => {
    return location.pathname === `/${username}${path}`
      ? "border-primary-600 text-primary-600 dark:border-primary-500 dark:text-primary-500"
      : "border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:border-neutral-300 dark:hover:border-neutral-600";
  };

  const updateBlogsInUserData = (updaterFunction) => {
    setUserData(currentUserData => {
        if (!currentUserData) return null;

        const newBlogs = updaterFunction(currentUserData.blogs || []);
        const newSaveBlogs = updaterFunction(currentUserData.saveBlogs || []);
        const newLikeBlogs = updaterFunction(currentUserData.likeBlogs || []);

        return {
            ...currentUserData,
            blogs: newBlogs,
            saveBlogs: newSaveBlogs,
            likeBlogs: newLikeBlogs,
        };
    });
  };

  // --- FIX: Functions to open/close modal ---
  const openModal = (title, content) => {
    setModalTitle(title);
    setModalContent(content);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  function renderComponent() {
    if (!userData) return null;

    const isOwner = Boolean(userId && userData._id === userId);

    if (location.pathname === `/${username}`) {
      const visible = isOwner ? userData.blogs : (userData.blogs || []).filter((blog) => !blog.draft);
      return (
        <DisplayBlogs blogs={visible} onCommentIconClick={handleCommentClick} setBlogs={updateBlogsInUserData} />
      );
    } else if (location.pathname === `/${username}/saved-blogs`) {
      return (
        <>
          {userData.showSavedBlogs || isOwner ? (
            <DisplayBlogs blogs={(userData.saveBlogs || []).filter(b => !b.draft || isOwner)} onCommentIconClick={handleCommentClick} setBlogs={updateBlogsInUserData} />
          ) : (
            <Navigate to={`/${username}`} />
          )}
        </>
      );
    } else if (location.pathname === `/${username}/draft-blogs`) {
      return (
        <>
          {isOwner ? (
            <DisplayBlogs blogs={(userData.blogs || []).filter((blog) => blog.draft)} onCommentIconClick={handleCommentClick} setBlogs={updateBlogsInUserData} />
          ) : (
            <Navigate to={`/${username}`} />
          )}
        </>
      );
    } else { // Liked blogs
      return (
        <>
          {userData.showLikedBlogs || isOwner ? (
            <DisplayBlogs blogs={(userData.likeBlogs || []).filter(b => !b.draft || isOwner)} onCommentIconClick={handleCommentClick} setBlogs={updateBlogsInUserData} />
          ) : (
            <Navigate to={`/${username}`} />
          )}
        </>
      );
    }
  }

  useEffect(() => {
    async function fetchUserDetails() {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        let res = await axios.get(
          `${getApiBaseUrl()}/users/${username.split("@")[1]}`,
          { headers }
        );
        // sanitize server response: remove null/invalid blog entries (handles deleted posts)
        const serverUser = res.data.user || {};
        const sanitize = (arr) =>
          Array.isArray(arr)
            ? arr.filter((b) => b && b._id && b.blogId && b.title)
            : [];
        serverUser.blogs = sanitize(serverUser.blogs);
        serverUser.likeBlogs = sanitize(serverUser.likeBlogs);
        serverUser.saveBlogs = sanitize(serverUser.saveBlogs);

        setUserData(serverUser);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to fetch user");
      }
    }
    fetchUserDetails();
  }, [username]);

  // --- FIX: Close modal if user navigates away ---
  useEffect(() => {
    closeModal();
  }, [location.pathname]);


  if (!userData) {
    return (
      <div className="flex justify-center items-center w-full h-[calc(100vh-200px)]">
        <span className="loader"></span>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-8">
        {/* Left Sidebar (Profile) */}
        <aside className="w-full lg:w-1/3">
          {/* --- FIX: Use new theme colors --- */}
          <div className="sticky top-24 p-6 bg-white dark:bg-neutral-900 rounded-lg shadow-md border border-neutral-200 dark:border-neutral-800">
            <div className="flex flex-col items-center">
              <Avatar
                name={userData.name}
                src={userData.profilePic}
                alt={userData.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-neutral-100 dark:border-neutral-700 shadow-lg"
              />
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mt-4">{userData.name}</h1>
              <p className="text-md text-neutral-500 dark:text-neutral-400">@{userData.username}</p>
              <p className="text-neutral-700 dark:text-neutral-300 my-3 text-center text-sm">{userData?.bio}</p>
              
              {/* --- FIX: Turned counts into buttons --- */}
              <div className="flex gap-4 justify-center text-neutral-600 dark:text-neutral-400 text-sm">
                <button onClick={() => openModal("Followers", userData.followers)} className="hover:underline">
                  <span className="font-bold text-neutral-900 dark:text-white">{userData.followers.length}</span> Followers
                </button>
                <button onClick={() => openModal("Following", userData.following)} className="hover:underline">
                  <span className="font-bold text-neutral-900 dark:text-white">{userData.following.length}</span> Following
                </button>
              </div>

              <div className="mt-4 w-full">
                {userId === userData._id ? (
                  <Link to="/edit-profile" className="w-full">
                    <button className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 px-5 py-2 rounded-full text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700">
                      Edit Profile
                    </button>
                  </Link>
                ) : (
                  <button
                    onClick={() =>
                      handleFollowCreator(userData?._id, token, dispatch)
                    }
                    className={`w-full px-5 py-2 rounded-full text-sm font-medium ${
                      following.includes(userData?._id)
                        ? "bg-neutral-100 text-neutral-800 border border-neutral-300 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-700"
                        : "bg-primary-600 text-white hover:bg-primary-700"
                    }`}
                  >
                    {following.includes(userData?._id) ? "Following" : "Follow"}
                  </button>
                )}
                {userId !== userData._id && token && (
                  <Link to={`/chat?user=${userData.username}`} className="block mt-2">
                    <button className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 px-5 py-2 rounded-full text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700">
                      Message
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </aside>
        
        {/* Profile Content (Main) */}
        <main className="w-full lg:w-2/3">
          <div className="border-b border-neutral-200 dark:border-neutral-700">
            <nav className="-mb-px flex gap-6 w-full" aria-label="Tabs">
              <Link
                to={`/${username}`}
                className={`pb-4 px-1 border-b-2 text-sm font-medium ${getActiveTabClass("")}`}
              >
                Home
              </Link>
              
              {(userData.showSavedBlogs || userData._id === userId) && (
                <Link
                  to={`/${username}/saved-blogs`}
                  className={`pb-4 px-1 border-b-2 text-sm font-medium ${getActiveTabClass("/saved-blogs")}`}
                >
                  Saved
                </Link>
              )}
              
              {(userData.showLikedBlogs || userData._id === userId) && (
                <Link
                  to={`/${username}/liked-blogs`}
                  className={`pb-4 px-1 border-b-2 text-sm font-medium ${getActiveTabClass("/liked-blogs")}`}
                >
                  Liked
                </Link>
              )}
              
              {userData._id === userId && (
                <Link
                  to={`/${username}/draft-blogs`}
                  className={`pb-4 px-1 border-b-2 text-sm font-medium ${getActiveTabClass("/draft-blogs")}`}
                >
                  Drafts
                </Link>
              )}
            </nav>
          </div>
          
          <div className="mt-6">
            {renderComponent()}
          </div>
        </main>
      </div>

      {/* --- FIX: Render the modal conditionally --- */}
      {isModalOpen && (
        <FollowListModal
          title={modalTitle}
          users={modalContent}
          onClose={closeModal}
        />
      )}
    </>
  );
}

export default ProfilePage;
