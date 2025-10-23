import BlogCard from "./BlogCard"; // Import the new BlogCard

function DisplayBlogs({ blogs, setBlogs, onCommentIconClick }) {
  
  // FIX: This component was crashing because `blogs` was undefined on initial render.
  // We add a check to make sure blogs is an array.
  const blogsArray = Array.isArray(blogs) ? blogs : [];

  return (
    <div>
      {blogsArray.length > 0 ? (
        blogsArray.map((blog) => (
          <BlogCard 
            key={blog._id} 
            blog={blog} 
            setBlogs={setBlogs} // Pass setter down
            onCommentIconClick={onCommentIconClick} // Pass handler down
          />
        ))
      ) : (
        <h1 className="my-10 text-2xl font-semibold text-gray-600 dark:text-gray-400">
          No posts found.
        </h1>
      )}
    </div>
  );
}

export default DisplayBlogs;