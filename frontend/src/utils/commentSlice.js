import { createSlice } from "@reduxjs/toolkit";

const commentSlice = createSlice({
  name: "commentSlice",
  initialState: {
    isOpen: false,
    showOnLoad: false, // New state
  },
  reducers: {
    setIsOpen(state, action) {
      state.isOpen = action.payload === false ? false : !state.isOpen;
      // If we are closing it, reset showOnLoad
      if (state.isOpen === false) {
        state.showOnLoad = false;
      }
    },
    // New action to open the panel on page load
    openOnLoad(state, action) {
        state.showOnLoad = true;
        state.isOpen = true;
    },
  },
});

export const { setIsOpen, openOnLoad } = commentSlice.actions;
export default commentSlice.reducer;