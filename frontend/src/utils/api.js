import axios from "axios";
import toast from "react-hot-toast";
import { updateData } from "./userSilce"; // Correct import

// API call for following a user
export async function handleFollowCreator(id, token, dispatch) {
  if (!token) {
    return toast.error("Please sign in to follow users");
  }
  try {
    let res = await axios.put(
      `${import.meta.env.VITE_BACKEND_URL}/follow/${id}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    toast.success(res.data.message);
    dispatch(updateData(["followers", id]));
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to follow user");
  }
}

// API call for saving/unsaving a blog
export async function handleSaveBlog(id, token) {
  if (!token) {
    return toast.error("Please sign in to save this blog");
  }
  try {
    let res = await axios.put(
      `${import.meta.env.VITE_BACKEND_URL}/save-blog/${id}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    toast.success(res.data.message);
    return true; // Return success
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to save blog");
    return false; // Return failure
  }
}

// API call for liking/unliking a blog
export async function handleLikeBlog(id, token) {
  if (!token) {
    return toast.error("Please sign in to like this blog");
  }
  try {
    let res = await axios.post(
      `${import.meta.env.VITE_BACKEND_URL}/blogs/like/${id}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    toast.success(res.data.message);
    return true; // Return success
  } catch (error) {
    toast.error(error.response?.data?.message || "Like failed");
    return false; // Return failure
  }
}