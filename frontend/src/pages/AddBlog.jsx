import axios from "axios";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate, useParams } from "react-router-dom";

// Import EditorJS tools
import EditorJS from "@editorjs/editorjs";
import Header from "@editorjs/header";
import NestedList from "@editorjs/nested-list";
import Marker from "@editorjs/marker";
import Underline from "@editorjs/underline";
import Embed from "@editorjs/embed";
import ImageTool from "@editorjs/image";
import TextVariantTune from "@editorjs/text-variant-tune";

import { setIsOpen } from "../utils/commentSlice";
import { removeSelectedBlog } from "../utils/selectedBlogSlice";
import useLoader from "../hooks/useLoader";
import { getApiBaseUrl } from "../utils/network";

function AddBlog() {
  const { id } = useParams(); // 'id' here is the blogId (slug)
  const editorjsRef = useRef(null);
  const [isLoading, startLoading, stopLoading] = useLoader();

  const { token } = useSelector((silce) => silce.user);
  // Get data from Redux store for editing
  const { title, description, image, content, draft, tags } = useSelector(
    (slice) => slice.selectedBlog
  );

  const [blogData, setBlogData] = useState({
    title: "",
    description: "",
    image: null,
    content: null,
    tags: [],
    draft: false,
  });

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleBlogSubmit = async (isUpdate) => {
    startLoading();

    let currentContent = blogData.content;
    if (editorjsRef.current) {
        try {
            currentContent = await editorjsRef.current.save();
        } catch (error) {
            console.error("EditorJS save error:", error);
            toast.error("Error saving content.");
            stopLoading();
            return;
        }
    }

    // --- Validation ---
    if (!blogData.title && !blogData.draft) {
      toast.error("Title is required to publish.");
      stopLoading();
      return;
    }
    if (!blogData.description && !blogData.draft) {
      toast.error("Description is required to publish.");
      stopLoading();
      return;
    }
    if (!blogData.image && !blogData.draft) {
      toast.error("Cover image is required to publish.");
      stopLoading();
      return;
    }
    if ((!currentContent || currentContent.blocks.length === 0) && !blogData.draft) {
      toast.error("Blog content cannot be empty to publish.");
      stopLoading();
      return;
    }
    // --- End Validation ---

    const formData = new FormData();
    formData.append("title", blogData.title);
    formData.append("description", blogData.description);
    if (blogData.image && typeof blogData.image !== 'string') {
        formData.append("image", blogData.image); // Append file only if it's a new file
    }
    formData.append("content", JSON.stringify(currentContent));
    formData.append("tags", JSON.stringify(blogData.tags || []));
    formData.append("draft", blogData.draft);

    let existingImages = [];

    if (currentContent && currentContent.blocks) {
      currentContent.blocks.forEach((block) => {
        if (block.type === "image") {
          if (block.data.file.image) { // 'image' is the File object from our uploader
            formData.append("images", block.data.file.image);
          } else if (isUpdate && block.data.file.url) {
            existingImages.push({
              url: block.data.file.url,
              imageId: block.data.file.imageId,
            });
          }
        }
      });
    }
    
    if (isUpdate) {
        formData.append("existingImages", JSON.stringify(existingImages));
    }

    try {
      const url = isUpdate 
        ? `${getApiBaseUrl()}/blogs/${id}`
        : `${getApiBaseUrl()}/blogs`;
        
      const method = isUpdate ? axios.put : axios.post; // Use PUT for updates

      const res = await method(url, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success(res.data.message);
      dispatch(removeSelectedBlog());
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || (isUpdate ? "Update failed" : "Post failed"));
    } finally {
      stopLoading();
    }
  }

  function initializeEditorjs(initialContent) {
    if (editorjsRef.current) {
        editorjsRef.current.destroy();
        editorjsRef.current = null;
    }
    
    editorjsRef.current = new EditorJS({
        holder: "editorjs",
        placeholder: "Write your story... (Type / for commands)",
        data: initialContent || { blocks: [] },
        tools: {
          header: { class: Header, inlineToolbar: true },
          List: { class: NestedList, inlineToolbar: true },
          Marker: { class: Marker, inlineToolbar: true },
          Underline: { class: Underline, inlineToolbar: true },
          Embed: { class: Embed, inlineToolbar: true },
          textVariant: TextVariantTune,
          image: {
            class: ImageTool,
            config: {
              uploader: {
                uploadByFile: async (imageFile) => {
                  return {
                    success: 1,
                    file: {
                      url: URL.createObjectURL(imageFile),
                      image: imageFile, // Pass the File object
                    },
                  };
                },
              },
            },
          },
        },
        tunes: ["textVariant"],
        onChange: async () => {
          if (editorjsRef.current) {
            let data = await editorjsRef.current.save();
            setBlogData((blogData) => ({ ...blogData, content: data }));
          }
        },
        // --- THIS IS THE FIX FOR THE '+' and '...' ICONS & TEXT VISIBILITY ---
        onReady: () => {
          const style = document.createElement('style');
          style.id = 'editorjs-custom-styles'; // Add an ID to prevent duplicates
        
          // Prevent adding the style block multiple times on re-renders
          if (document.getElementById(style.id)) {
            return;
          }
        
          style.innerHTML = `
            /* --- 1. Align & Style Toolbar Buttons --- */
            
            /* This is the container for the + and ... buttons */
            .ce-toolbar__actions {
              display: flex;
              align-items: center;
              gap: 4px; /* Add a small gap between buttons */
            }
        
            /* Style for the '+' button */
            .ce-toolbar__plus {
              color: white !important;
              background-color: #2563eb !important; /* primary-600 */
              border: none !important;
              border-radius: 8px !important;
              width: 28px;
              height: 28px;
              display: flex !important;
              align-items: center;
              justify-content: center;
              transition: all 0.2s ease;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              margin: 0 !important; /* Reset margin */
            }
            .ce-toolbar__plus:hover {
              background-color: #1d4ed8 !important; /* primary-700 */
              transform: scale(1.1);
            }
        
            /* Style for the '...' (6 dots) drag handle button */
            .ce-toolbar__settings-btn {
              color: #a1a1aa !important; /* neutral-400 */
              border: none !important;
              border-radius: 8px !important;
              width: 28px;
              height: 28px;
              display: flex !important;
              align-items: center;
              justify-content: center;
              transition: all 0.2s ease;
              margin: 0 !important; /* Reset margin */
            }
            .ce-toolbar__settings-btn:hover {
              color: #e4e4e7 !important; /* neutral-200 */
              background-color: #3f3f46 !important; /* neutral-700 */
            }
        
            /* --- 2. Fix Text Visibility in Dark Mode --- */
        
            /* Force dark text on <mark> tags (Marker tool) */
            /* This applies in BOTH light and dark mode for consistency */
            .codex-editor__redactor mark {
              color: #18181b !important; /* neutral-900 */
            }
        
            /* Force dark text on TextVariantTune backgrounds */
            /* This applies in BOTH light and dark mode */
            .codex-editor__redactor .cdx-text-variant-blue,
            .codex-editor__redactor .cdx-text-variant-red,
            .codex-editor__redactor .cdx-text-variant-green,
            .codex-editor__redactor .cdx-text-variant-yellow {
              color: #18181b !important; /* neutral-900 */
            }
        
            /* Set default editor text color in dark mode */
            .dark .codex-editor__redactor .ce-block__content,
            .dark .codex-editor__redactor .ce-paragraph {
              color: #d4d4d8; /* neutral-300 */
            }
            
            /* Fix for placeholder text in dark mode */
            .dark .ce-placeholder::before {
              color: #71717a !important; /* neutral-500 */
              opacity: 1 !important;
            }
          `;
          document.head.appendChild(style);
        },
      });
  }
  

  function handleKeyDown(e) {
    // --- THIS IS THE FIX ---
    // Replaces spaces with hyphens to match the search logic
    const tag = e.target.value.toLowerCase().trim().replace(/ /g, "-");
    // --- END FIX ---

    if (e.key === "Enter" && tag) {
      e.preventDefault();
      if ((blogData.tags || []).length >= 10) {
        return toast.error("You can add up to 10 tags");
      }
      if ((blogData.tags || []).includes(tag)) {
        return toast.error("This tag already added");
      }
      setBlogData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tag],
      }));
      e.target.value = "";
    }
  }

  function deleteTag(index) {
    const updatedTags = blogData.tags.filter(
      (_, tagIndex) => tagIndex !== index
    );
    setBlogData((prev) => ({ ...prev, tags: updatedTags }));
  }

  useEffect(() => {
    if (id) {
        // If in edit mode, set the blog data from Redux
        setBlogData({
            title: title || "",
            description: description || "",
            image: image || null,
            content: content || { blocks: [] },
            draft: draft || false,
            tags: tags || [],
        });
        initializeEditorjs(content);
    } else {
        // New post mode, initialize with empty editor
        initializeEditorjs({ blocks: [] });
    }

    return () => {
      if (editorjsRef.current && typeof editorjsRef.current.destroy === 'function') {
        editorjsRef.current.destroy();
        editorjsRef.current = null;
      }
      dispatch(setIsOpen(false));
      
      // Clean up the injected style when component unmounts
      const style = document.getElementById('editorjs-custom-styles');
      if (style) {
        style.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, content]); // Re-init if the ID or initial content from Redux changes

  if (token == null) {
    return <Navigate to={"/signin"} />
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white dark:bg-neutral-900 p-8 rounded-lg shadow-lg my-10 border border-neutral-200 dark:border-neutral-800">
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-8">
                {id ? "Edit Your Post" : "Write a New Post"}
            </h1>
            
            <div className="space-y-8">
                <div>
                    <label className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">Cover Image</label>
                    <label htmlFor="image" className="mt-2 cursor-pointer group">
                        {blogData.image ? (
                        <img
                            src={
                            typeof blogData.image === "string"
                                ? blogData.image
                                : URL.createObjectURL(blogData.image)
                            }
                            alt="Cover preview"
                            className="w-full aspect-[16/9] object-cover border dark:border-neutral-700 rounded-lg"
                        />
                        ) : (
                        <div className="w-full aspect-[16/9] bg-neutral-100 dark:bg-neutral-800 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg flex justify-center items-center text-neutral-500 dark:text-neutral-400 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700">
                            Click to select a cover image
                        </div>
                        )}
                    </label>
                    <input
                        className="hidden"
                        id="image"
                        type="file"
                        accept=".png, .jpeg, .jpg"
                        onChange={(e) =>
                        setBlogData((blogData) => ({
                            ...blogData,
                            image: e.target.files[0],
                        }))
                        }
                    />
                </div>

                <div>
                    <label htmlFor="title" className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">Title</label>
                    <input
                        id="title"
                        type="text"
                        placeholder="Your post title..."
                        onChange={(e) =>
                        setBlogData((blogData) => ({
                            ...blogData,
                            title: e.target.value,
                        }))
                        }
                        value={blogData.title}
                        className="mt-2 w-full p-3 text-lg"
                    />
                </div>
                
                <div>
                    <label htmlFor="description" className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">Description (Short Summary)</label>
                    <textarea
                        id="description"
                        type="text"
                        placeholder="A short summary for the post..."
                        value={blogData.description}
                        className="mt-2 h-28 resize-none w-full p-3 text-lg"
                        onChange={(e) =>
                        setBlogData((blogData) => ({
                            ...blogData,
                            description: e.target.value,
                        }))
                        }
                    />
                </div>

                <div>
                    <label htmlFor="tags" className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">Tags</label>
                    <div className="mt-2 rounded-lg p-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700">
                        <div className="flex flex-wrap gap-2 mb-2">
                            {blogData?.tags?.map((tag, index) => (
                                <div
                                key={index}
                                className="bg-neutral-200 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-200 rounded-full px-3 py-1 flex gap-2 justify-center items-center"
                                >
                                <span className="text-sm font-medium">{tag}</span>
                                <i
                                    className="fi fi-sr-cross-circle text-sm cursor-pointer"
                                    onClick={() => deleteTag(index)}
                                ></i>
                                </div>
                            ))}
                        </div>
                        <input
                            id="tags"
                            type="text"
                            placeholder="Add up to 10 tags... (press Enter)"
                            className="w-full text-lg focus:outline-none bg-transparent !border-0 !ring-0 !shadow-none p-0"
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="draft" className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">Status</label>
                    <select
                        id="draft"
                        value={blogData.draft}
                        className="mt-2 w-full p-3 text-lg"
                        onChange={(e) =>
                        setBlogData((prev) => ({
                            ...prev,
                            draft: e.target.value === "true",
                        }))
                        }
                    >
                        <option value="false">Public (Visible to everyone)</option>
                        <option value="true">Draft (Only visible to you)</option>
                    </select>
                </div>

                {/* --- FIX: Content Editor UI --- */}
                <div>
                    <label className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">Content</label>
                    <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        Type <kbd className="px-2 py-1 bg-neutral-200 dark:bg-neutral-600 rounded-md font-mono text-xs">/</kbd> for block options (headings, lists, images).
                    </div>
                    {/* This div is the container for the editor */}
                    <div id="editorjs" className="mt-2 w-full border border-neutral-300 dark:border-neutral-700 rounded-lg p-4 min-h-[300px] bg-white dark:bg-neutral-800"></div>
                </div>
            </div>

            {!isLoading ? (
                <div className="flex gap-4 mt-8">
                <button
                    className="bg-primary-600 hover:bg-primary-700 px-7 py-3 rounded-full font-semibold text-white"
                    onClick={() => handleBlogSubmit(!!id)}
                >
                    {blogData.draft
                    ? "Save Draft"
                    : id
                    ? "Update Post"
                    : "Publish Post"}
                </button>
                <button
                    className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 px-7 py-3 rounded-full font-semibold text-neutral-700 dark:text-neutral-200"
                    onClick={() => navigate(-1)}
                >
                    Cancel
                </button>
                </div>
            ) : (
                <div className="mt-8">
                    <span className="loader"></span>
                </div>
            )}
        </div>
    </div>
  );
}

export default AddBlog;
