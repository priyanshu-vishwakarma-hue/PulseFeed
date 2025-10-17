import axios from "axios";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import useLoader from "./useLoader";

function usePagination(path, queryParams = {}, limit = 5, page = 1) {
  const [hasMore, setHasMore] = useState(true);
  const [blogs, setBlogs] = useState([]);
  const [isLoading, startLoading, stopLoading] = useLoader();

  // We stringify the query object to create a stable dependency
  // for the useEffect hook.
  const queryJSON = JSON.stringify(queryParams);

  useEffect(() => {
    async function fetchBlogs() {
      try {
        startLoading();
        let res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/${path}`,
          {
            params: { ...queryParams, limit, page },
          }
        );
        
        // --- THIS IS THE FIX ---
        // If it's page 1, REPLACE the blogs. Otherwise, append.
        setBlogs((prev) => {
          if (page === 1) {
            return res.data.blogs; // This is the reset
          }
          // This prevents duplicates on "Load More"
          const newBlogs = res.data.blogs.filter(
            b => !prev.some(p => p._id === b._id)
          );
          return [...prev, ...newBlogs];
        });
        // --- END FIX ---
        
        setHasMore(res.data.hasMore);
      } catch (error) {
        if (page === 1) { 
            setBlogs([]); // Clear old results on error
            toast.error(error?.response?.data?.message || "Failed to fetch blogs");
        }
        setHasMore(false);
      } finally {
        stopLoading();
      }
    }

    // --- FIX: Re-fetch if page is 1 (a reset) or if hasMore is true ---
    if (page === 1) {
      setHasMore(true); // Reset hasMore for the new query
      fetchBlogs();
    } else if (hasMore) {
      fetchBlogs();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, path, queryJSON, limit]); // Added limit to deps

  // Return setBlogs so components can update state optimistically
  return { blogs, hasMore, isLoading, setBlogs };
}

export default usePagination;