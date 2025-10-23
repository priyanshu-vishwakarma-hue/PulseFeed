import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Helper component for nav links
const NavLink = ({ to, icon, text }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link 
      to={to}
      className={`flex items-center gap-4 px-4 py-3 rounded-lg text-lg ${
        isActive
          // --- FIX: Use new theme colors ---
          ? 'font-bold text-primary-600 bg-primary-100 dark:bg-neutral-800 dark:text-primary-400'
          : 'font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
      }`}
    >
      <i className={`fi ${icon} text-xl w-6 text-center`}></i>
      <span>{text}</span>
    </Link>
  );
};

function LeftSidebar() {
  const { token, username } = useSelector((state) => state.user);

  return (
    <aside className="w-full"> 
      <div className="space-y-2">
        <NavLink to="/" icon="fi-rr-home" text="Home" />
        {token && (
          <>
            <NavLink to={`/@${username}`} icon="fi-rr-user" text="Profile" />
            <NavLink to={`/@${username}/saved-blogs`} icon="fi-rr-bookmark" text="Saved" />
          </>
        )}
        <Link to={"/add-blog"} className="flex items-center justify-center gap-2 w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-3 rounded-lg text-lg mt-4">
          <i className="fi fi-rr-edit"></i>
          <span>Write</span>
        </Link>
      </div>
    </aside>
  );
}

export default LeftSidebar;