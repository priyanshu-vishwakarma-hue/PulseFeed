import { useEffect } from "react";
import UserCard from "./UserCard";

function FollowListModal({ title, users = [], onClose }) {
  // Close modal on 'Escape' key press
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4"
        onClick={onClose}
      >
        {/* Modal Content */}
        <div
          className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-sm max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              <i className="fi fi-br-cross text-lg"></i>
            </button>
          </div>

          {/* User List */}
          <div className="overflow-y-auto p-4 space-y-3">
            {users.length > 0 ? (
              users.map((user) => (
                <UserCard 
                  key={user._id} 
                  user={user} 
                  onUserClick={onClose} // Close modal when a user is clicked
                />
              ))
            ) : (
              <p className="text-neutral-500 dark:text-neutral-400 text-center py-4">
                No users found.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default FollowListModal;