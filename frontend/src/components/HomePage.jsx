import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import usePagination from "../hooks/usePagination";
import DisplayBlogs from "../components/DisplayBlogs";
import { useDispatch, useSelector } from "react-redux";
import { addSlectedBlog } from "../utils/selectedBlogSlice";
import Comment from "../components/Comment";
import { openOnLoad } from "../utils/commentSlice"; // Import openOnLoad
import LeftSidebar from "../components/LeftSidebar"; // Import new sidebar

function HomePage() {
  const [page, setPage] = useState(1);
  const { blogs, hasMore, isLoading, setBlogs } = usePagination("blogs", {}, 5, page);
  const { isOpen: isSidePanelOpen } = useSelector((state) => state.comment);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // This function is passed to DisplayBlogs (via BlogCard)
  const onCommentClick = (blog) => {
    dispatch(addSlectedBlog(blog));
    dispatch(openOnLoad()); // Tell panel to open on page load
    navigate(`/blog/${blog.blogId}`); // Navigate to the blog page
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-8 relative">
        
        {/* Left Sidebar (Desktop only) */}
        <div className="hidden lg:block w-full lg:w-1/5 self-start sticky top-24 pt-8">
          <LeftSidebar />
        </div>

        {/* Main Content Feed */}
        <main className="w-full lg:w-3/5 py-8">
          {/* --- FIX: Use new theme colors --- */}
          <h1 className="text-3xl font-bold mb-2 text-neutral-900 dark:text-neutral-100">Latest Posts</h1>
          
          <DisplayBlogs 
            blogs={blogs}
            setBlogs={setBlogs} // Pass setBlogs for optimistic updates
            onCommentIconClick={onCommentClick}
          />
          
          {isLoading && (
             <div className="flex justify-center items-center w-full h-64">
               <span className="loader"></span>
             </div>
          )}
          
          {hasMore && !isLoading && (
            <button
              onClick={() => setPage((prev) => prev + 1)}
              className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium px-4 py-3 rounded-md"
            >
              Load more
            </button>
          )}
        </main>

        {/* Right Sidebar (Desktop only) */}
        <aside className="hidden lg:block w-full lg:w-1/5 self-start sticky top-24 pt-8">
          <div className=""> 
            {/* --- FIX: Use new theme colors --- */}
            <h2 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">Recommended Topics</h2>
            <div className="flex flex-wrap gap-2">
              {["React", "Node js", "Mern", "Express"].map(
                (tag) => ( 
                  <Link 
                    key={tag} 
                    to={`/tag/${tag}`} 
                    // --- FIX: Use new theme colors ---
                    className="bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded-full px-4 py-2 text-sm font-medium"
                  >
                    {tag}
                  </Link>
                )
              )}
            </div>
          </div>
        </aside>

      </div>
      
      {/* This is the slide-out comment panel */}
      {isSidePanelOpen && <Comment />} 
    </div>
  );
}

export default HomePage;