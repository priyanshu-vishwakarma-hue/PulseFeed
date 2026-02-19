import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import DisplayBlogs from "./DisplayBlogs";
import usePagination from "../hooks/usePagination";

function SearchBlogs() {
  const [searchParams] = useSearchParams(); 
  const { tag } = useParams();
  const [page, setPage] = useState(1);
  const loadMoreRef = useRef(null);

  const q = searchParams.get("q");

  // --- THIS IS THE FIX ---
  // We only need to convert to lowercase, just like when saving.
  // We remove .replace(" ", "-")
  const query = tag
    ? { tag: tag.toLowerCase() }
    : { search: q };
  // --- END FIX ---

  const { blogs, hasMore, isLoading } = usePagination("search-blogs", query, 5, page);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading) {
          setPage((prev) => prev + 1);
        }
      },
      {
        root: null,
        rootMargin: "500px 0px",
        threshold: 0,
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoading]);

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
      {blogs.length > 0 && <DisplayBlogs blogs={blogs} setBlogs={() => {}} />}

      {isLoading && blogs.length === 0 && (
        <div className="flex justify-center items-center w-full h-52">
          <span className="loader"></span>
        </div>
      )}

      {hasMore && <div ref={loadMoreRef} className="h-2" aria-hidden="true" />}

      {isLoading && blogs.length > 0 && (
        <div className="flex justify-center items-center py-8">
          <span className="loader"></span>
        </div>
      )}
    </div>
  );
}

export default SearchBlogs;
