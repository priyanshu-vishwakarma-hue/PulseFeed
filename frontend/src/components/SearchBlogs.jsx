import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import DisplayBlogs from "./DisplayBlogs";
import usePagination from "../hooks/usePagination";

function SearchBlogs() {
  const [searchParams] = useSearchParams(); 
  const { tag } = useParams();
  const [page, setPage] = useState(1);

  const q = searchParams.get("q");

  // --- THIS IS THE FIX ---
  // We only need to convert to lowercase, just like when saving.
  // We remove .replace(" ", "-")
  const query = tag
    ? { tag: tag.toLowerCase() }
    : { search: q };
  // --- END FIX ---

  const { blogs, hasMore } = usePagination("search-blogs", query, 1, page);

  return (
    <div className="w-full p-5 sm:w-[80%] md:w-[60%] lg:w-[55%] mx-auto">
      {/* --- Updated theme colors --- */}
      <h1 className="my-10 text-4xl text-neutral-500 font-bold ">
        Results for <span className="text-neutral-900 dark:text-neutral-100">{tag ? tag : q}</span>
      </h1>
      
      {/* NOTE: We don't pass `setBlogs` here because this page is for searching,
        not for managing a persistent list like the homepage or profile.
        The optimistic updates will still work on the cards themselves,
        but the list won't be modified (which is the correct behavior here).
      */}
      {blogs.length > 0 && <DisplayBlogs blogs={blogs} />}
      
      {hasMore && (
        <button
          onClick={() => setPage((prev) => prev + 1)}
          className="rounded-3xl mx-auto bg-primary-500 text-white px-7 py-2"
        >
          Load more
        </button>
      )}
    </div>
  );
}

export default SearchBlogs;