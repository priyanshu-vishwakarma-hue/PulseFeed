import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom"; // Added useLocation
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../utils/userSilce";
import { useTheme } from "../contexts/ThemeContext";

const logoUrl = "https://i.pinimg.com/736x/77/54/2f/77542ff0544861f29a82c1a1aa824cab.jpg";

function Navbar() {
  const { token, name, profilePic, username } = useSelector(
    (state) => state.user
  );
  const { isOpen: isCommentPanelOpen } = useSelector((state) => state.comment);
  
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation(); // Get current location
  const [showPopup, setShowPopup] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false); 

  const dispatch = useDispatch();
  function handleLogout() {
    dispatch(logout());
    setShowPopup(false);
  }

  useEffect(() => {
    if (window.location.pathname !== "/search") {
      setSearchQuery("");
      setShowMobileSearch(false);
    }
  }, [navigate, location.pathname]); 

  const handleSearch = (query) => {
      if (query?.trim()) {
        navigate(`/search?q=${query.trim()}`);
        setShowMobileSearch(false);
      }
  };

  const closeMobileSearch = () => {
      setShowMobileSearch(false);
      setSearchQuery("");
  };

  // --- FIX: Unified inactive styles ---
  const getAuthButtonClasses = (path) => { // Removed 'type' argument
    const isActive = location.pathname === path;
    const baseClasses = "px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150"; 

    if (isActive) {
      // Active Button Style (Solid Blue Background)
      return `${baseClasses} bg-primary-600 text-white`; 
    } else {
      // Inactive Button Style (Blue border, blue text, transparent bg on hover)
      return `${baseClasses} bg-transparent border border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/50`;
    }
  };

  return (
    <>
      <nav 
        className={`bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 
                   sticky top-0 z-50 transition-all duration-300
                   ${isCommentPanelOpen ? 'pr-0 sm:pr-[400px]' : ''}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex justify-between items-center h-16">
            
            {/* Logo OR Back Button (Only below sm breakpoint) */}
            {showMobileSearch && (
              <button 
                onClick={closeMobileSearch} 
                className="sm:hidden text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-500 mr-2"
              >
                <i className="fi fi-rr-arrow-left text-xl"></i>
              </button>
            )}
            
            <Link to={"/"}>
              <div className={`flex-shrink-0 flex items-center ${showMobileSearch ? 'hidden sm:flex' : 'flex'} flex gap-2 items-center text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-500`}>
                  <img className="h-8 w-8 object-cover rounded-md" src={logoUrl} alt="logo" />
                  <span className="text-sm font-medium hidden sm:inline ">HOME</span>
              </div>
            </Link>


            {/* Search Bar */}
            <div className={`relative ${showMobileSearch ? 'flex-grow mx-2 sm:flex-grow-0 sm:mx-0 sm:block' : 'hidden sm:block'}`}> 
              <i className="fi fi-rr-search absolute text-lg top-1/2 -translate-y-1/2 left-3 text-neutral-400 z-10 pointer-events-none"></i>
              <input
                type="text"
                className={`w-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full pl-10 pr-4 py-2 text-sm 
                            ${showMobileSearch ? 'block' : 'sm:block sm:w-56 md:w-64 lg:w-72'} `} 
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch(searchQuery);
                  }
                }}
                autoFocus={showMobileSearch && window.innerWidth < 640} 
              />
            </div>

            {/* Right side icons/buttons */}
            <div className={`flex items-center gap-2 sm:gap-4 ${showMobileSearch ? 'hidden sm:flex' : 'flex'}`}> 
              {/* Mobile Search Icon */}
              <button 
                onClick={() => setShowMobileSearch(true)} 
                className="sm:hidden text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-500"
              >
                <i className="fi fi-rr-search text-xl"></i>
              </button>
            
              {/* Other Icons */}
              <button onClick={toggleTheme} className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-500">
                {theme === 'light' ? <i className="fi fi-rr-moon text-xl"></i> : <i className="fi fi-rr-sun text-xl"></i>}
              </button>

              <Link to={"/add-blog"} className="flex gap-2 items-center text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-500">
                <i className="fi fi-rr-edit text-xl"></i>
                <span className="text-sm font-medium hidden sm:inline">Write</span>
              </Link>

              {/* Profile/Auth section */}
              {token ? (
                // Logged-in view
                <div className="relative">
                   <button
                    className="w-10 h-10 aspect-square rounded-full overflow-hidden focus:outline-none"
                    onClick={() => setShowPopup((prev) => !prev)}
                  >
                    <img
                      src={
                        profilePic ||
                        `https://api.dicebear.com/9.x/initials/svg?seed=${name}`
                      }
                      alt="User profile"
                      className="rounded-full w-full h-full object-cover"
                    />
                  </button>
                  {showPopup && (
                    <div
                      onMouseLeave={() => setShowPopup(false)}
                      className="w-48 bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-md shadow-lg absolute z-40 right-0 top-12 py-1"
                    >
                      <Link to={`/@${username}`} onClick={() => setShowPopup(false)}> <p className="popup">Profile</p> </Link>
                      <Link to={`/edit-profile`} onClick={() => setShowPopup(false)}> <p className="popup">Edit Profile</p> </Link>
                      <Link to={"/setting"} onClick={() => setShowPopup(false)}> <p className="popup">Settings</p> </Link>
                      <hr className="my-1 border-neutral-200 dark:border-neutral-700"/>
                      <p className="popup text-red-600 dark:hover:bg-red-500/10" onClick={handleLogout}> Log Out </p>
                    </div>
                  )}
                </div>
              ) : (
                // Logged-out view
                <div className="flex gap-2">
                  <Link to={"/signin"}>
                     {/* --- Apply conditional classes (now unified) --- */}
                    <button className={getAuthButtonClasses('/signin')}>
                      Log in
                    </button>
                  </Link>
                  <Link to={"/signup"}>
                     {/* --- Apply conditional classes (now unified) --- */}
                     <button className={getAuthButtonClasses('/signup')}>
                      Sign up
                    </button>
                  </Link>
                </div>
              )}
            </div>
            
          </div>
        </div>
      </nav>
      
      <Outlet />
    </>
  );
}

export default Navbar;