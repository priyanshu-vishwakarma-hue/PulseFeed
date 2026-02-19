import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Helper component for nav links
const NavLink = ({ to, icon, text }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link 
      to={to}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 ${
        isActive
          ? 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-900/40 dark:bg-primary-900/20 dark:text-primary-300'
          : 'border-transparent text-neutral-700 hover:border-neutral-200 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/70'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
          isActive
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
            : 'bg-neutral-100 text-neutral-600 group-hover:bg-white dark:bg-neutral-800 dark:text-neutral-400 dark:group-hover:bg-neutral-700'
        }`}
      >
        <i className={`fi ${icon} text-base`}></i>
      </span>
      <span className="text-[15px] font-medium">{text}</span>
    </Link>
  );
};

function LeftSidebar() {
  const { token, username } = useSelector((state) => state.user);
  const { unreadByConversation } = useSelector((state) => state.chat);
  const totalUnread = Object.values(unreadByConversation || {}).reduce(
    (sum, count) => sum + Number(count || 0),
    0
  );

  return (
    <aside className="w-full">
      <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Navigation
        </p>
        <div className="space-y-1.5">
        <NavLink to="/" icon="fi-rr-home" text="Home" />
        {token && (
          <>
            <NavLink to={`/@${username}`} icon="fi-rr-user" text="Profile" />
            <NavLink to={`/@${username}/saved-blogs`} icon="fi-rr-bookmark" text="Saved" />
            <Link to={"/chat"} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent text-neutral-700 hover:border-neutral-200 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/70">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 group-hover:bg-white dark:bg-neutral-800 dark:text-neutral-400 dark:group-hover:bg-neutral-700">
                <i className="fi fi-rr-comment-alt text-base"></i>
              </span>
              <span className="text-[15px] font-medium">Chat</span>
              {totalUnread > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center font-semibold">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </Link>
          </>
        )}
        </div>
        <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <Link
            to={"/add-blog"}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
          <i className="fi fi-rr-edit text-sm"></i>
          <span>Write</span>
        </Link>
        </div>
      </div>
    </aside>
  );
}

export default LeftSidebar;
