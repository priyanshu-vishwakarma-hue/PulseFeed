import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
  name: "userSlice",
  initialState: JSON.parse(localStorage.getItem("user")) || {
    token: null,
    name: null,
    username: null,
    email: null,
    id: null,
    profilePic: null,
    followers: [],
    following: [],
    saveBlogs: [],
    likeBlogs: [],
  },
  reducers: {
    login(state, action) {
      const payload = { followers: [], following: [], saveBlogs: [], likeBlogs: [], ...action.payload };
      localStorage.setItem("user", JSON.stringify(payload));
      return payload;
    },
    logout(state, action) {
      localStorage.removeItem("user");
      return {
        token: null,
      };
    },

    updateData(state, action) {
      const data = action.payload;
      if (data[0] === "visibility") {
        localStorage.setItem("user", JSON.stringify({ ...state, ...data[1] }));
        return { ...state, ...data };
      } else if (data[0] === "followers") {
        const finalData = {
          ...state,
          following: state?.following?.includes(data[1])
            ? state?.following?.filter((id) => id !== data[1])
            : [...state.following, data[1]],
        };

        localStorage.setItem("user", JSON.stringify(finalData));
        return finalData;
      }
    },

    // Toggle presence of blogId in user's likeBlogs (keeps local state in sync)
    toggleLikeBlogLocal(state, action) {
      const blogId = action.payload;
      if (!state.likeBlogs) state.likeBlogs = [];
      state.likeBlogs = state.likeBlogs.includes(blogId)
        ? state.likeBlogs.filter((id) => id !== blogId)
        : [...state.likeBlogs, blogId];
      localStorage.setItem("user", JSON.stringify(state));
      return state;
    },

    // Toggle presence of blogId in user's saveBlogs
    toggleSaveBlogLocal(state, action) {
      const blogId = action.payload;
      if (!state.saveBlogs) state.saveBlogs = [];
      state.saveBlogs = state.saveBlogs.includes(blogId)
        ? state.saveBlogs.filter((id) => id !== blogId)
        : [...state.saveBlogs, blogId];
      localStorage.setItem("user", JSON.stringify(state));
      return state;
    },

    // Remove blogId from all user lists (used when a blog is deleted on server)
    removeBlogFromLists(state, action) {
      const blogId = action.payload;
      state.blogs = (state.blogs || []).filter((id) => id !== blogId);
      state.saveBlogs = (state.saveBlogs || []).filter((id) => id !== blogId);
      state.likeBlogs = (state.likeBlogs || []).filter((id) => id !== blogId);
      localStorage.setItem("user", JSON.stringify(state));
      return state;
    },
  },
});

export const { login, logout, updateData, toggleLikeBlogLocal, toggleSaveBlogLocal, removeBlogFromLists } = userSlice.actions;
export default userSlice.reducer;
