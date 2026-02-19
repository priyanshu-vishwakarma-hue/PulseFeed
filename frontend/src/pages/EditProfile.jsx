import axios from "axios";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { login } from "../utils/userSilce";
import { Navigate, useNavigate } from "react-router-dom";
import useLoader from "../hooks/useLoader";
import { getApiBaseUrl } from "../utils/network";

function EditProfile() {
  const {
    token,
    id: userId,
    email,
    name,
    username,
    profilePic,
    bio,
  } = useSelector((state) => state.user);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isLoading, startLoading, stopLoading] = useLoader();

  const [userData, setUserData] = useState({
    profilePic: profilePic || null, // Store URL
    username: username || "",
    name: name || "",
    bio: bio || "",
  });
  
  const [previewUrl, setPreviewUrl] = useState(profilePic || null); // For image preview
  const [imageFile, setImageFile] = useState(null); // For new file upload

  const [isButtonDisabled, setIsButtonDisabled] = useState(true);

  // Check if data has changed
  useEffect(() => {
    const hasChanged = 
      userData.name !== (name || "") ||
      userData.username !== (username || "") ||
      userData.bio !== (bio || "") ||
      previewUrl !== (profilePic || null);
    
    setIsButtonDisabled(!hasChanged);
  }, [userData, previewUrl, name, username, bio, profilePic]);


  function handleChange(e) {
    const { value, name } = e.target;
    setUserData((prevData) => ({ ...prevData, [name]: value }));
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file); // Store the file object
      setPreviewUrl(URL.createObjectURL(file)); // Set preview
      setUserData(prev => ({ ...prev, profilePic: "new" })); // Mark pic as changed
    }
  }

  function handleRemoveImage() {
    setImageFile(null);
    setPreviewUrl(null);
    setUserData(prev => ({ ...prev, profilePic: null }));
  }

  async function handleUpdateProfile() {
    startLoading();
    setIsButtonDisabled(true);
    
    const formData = new FormData();
    formData.append("name", userData.name);
    formData.append("username", userData.username);
    formData.append("bio", userData.bio);
    
    if (imageFile) {
      // New file is being uploaded
      formData.append("profilePic", imageFile);
    } else if (userData.profilePic === null && profilePic !== null) {
      // Image was explicitly removed
      formData.append("profilePic", "null"); // Send string 'null' to signal removal
    }
    // If neither of above, profile pic wasn't changed, so do nothing.

    try {
      const res = await axios.put( 
        `${getApiBaseUrl()}/users/${userId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success(res.data.message);
      // Update redux state with new user info
      dispatch(login({ ...res.data.user, token, email, id: userId }));
      navigate(`/@${res.data.user.username}`); // Navigate to new username if it changed
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      stopLoading();
    }
  }

  if (token == null) {
    return <Navigate to={"/signin"} />
  }
  
  return (
    <div className="w-full p-5">
      <div className=" w-full  md:w-[70%] lg:w-[55%] mx-auto my-10 lg:px-10">
        {/* --- FIX: Updated theme colors --- */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
          <h1 className="text-center text-3xl font-medium my-4 dark:text-white">Edit Profile</h1>
          <div>
            <div className="">
              <h2 className="text-2xl font-semibold my-2 dark:text-neutral-200">Photo</h2>
              <div className="flex items-center flex-col gap-3">
                <div className="w-[150px] h-[150px] cursor-pointer aspect-square rounded-full overflow-hidden">
                  <label htmlFor="image" className=" ">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt=""
                        className="rounded-full w-full h-full object-cover"
                      />
                    ) : (
                      // --- FIX: Background for placeholder ---
                      <div className="w-[150px] h-[150px] bg-neutral-100 dark:bg-neutral-800 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-full aspect-square flex justify-center items-center text-neutral-500 dark:text-neutral-400">
                        Select Image
                      </div>
                    )}
                  </label>
                </div>
                <button
                  type="button"
                  className="text-lg text-red-500 font-medium cursor-pointer"
                  onClick={handleRemoveImage}
                >
                  Remove
                </button>
              </div>
              <input
                className="hidden"
                id="image"
                type="file"
                name="profilePic"
                accept=".png, .jpeg, .jpg"
                onChange={handleFileChange}
              />
            </div>

            <div className="my-4">
              <h2 className="text-2xl font-semibold my-2 dark:text-neutral-200">Name</h2>
              <input
                name="name"
                type="text"
                placeholder="Name"
                value={userData.name}
                onChange={handleChange}
                className="w-full p-2 text-lg"
              />
            </div>
            <div className="my-4">
              <h2 className="text-2xl font-semibold my-2 dark:text-neutral-200">Username</h2>
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={userData.username}
                onChange={handleChange}
                className="w-full p-2 text-lg"
              />
            </div>

            <div className="my-4">
              <h2 className="text-2xl font-semibold my-2 dark:text-neutral-200">Bio</h2>
              <textarea
                type="text"
                name="bio"
                placeholder="Bio"
                value={userData.bio}
                className="h-[100px] resize-none w-full p-3 text-lg"
                onChange={handleChange}
              />
            </div>

            {!isLoading ? (
              <div>
                <button
                  disabled={isButtonDisabled}
                  className={`px-7 py-3 rounded-full text-white my-3 font-semibold
                    ${isButtonDisabled 
                      ? " bg-primary-300 dark:bg-primary-800 dark:text-neutral-500 cursor-not-allowed" 
                      : " bg-primary-600 hover:bg-primary-700"
                    } `}
                  onClick={handleUpdateProfile}
                >
                  Update
                </button>
                {/* --- FIX: Back button theme --- */}
                <button
                  className={`mx-4 px-7 py-3 rounded-full text-neutral-700 dark:text-neutral-200 my-3 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600`}
                  onClick={() => navigate(-1)}
                >
                  Back
                </button>
              </div>
            ) : (
              <span className="loader"></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditProfile;
