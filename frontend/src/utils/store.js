import { configureStore } from "@reduxjs/toolkit";
import userSlice from "./userSilce";
import selectedBlog from "./selectedBlogSlice";
import commentSlice from "./commentSlice";
import chatSlice from "./chatSlice";

const store = configureStore({
  reducer: {
    user: userSlice,
    selectedBlog: selectedBlog,
    comment: commentSlice,
    chat: chatSlice,
  },
});

export default store;
