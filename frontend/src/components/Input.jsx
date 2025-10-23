import  { useState } from "react";

function Input({ type, placeholder, value, setUserData, field, icon }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative w-full">
      <i
        className={
          "fi " +
          icon +
          "  absolute top-1/2 -translate-y-1/2 mt-1 left-4 text-neutral-400"
        }
      ></i>

      <input
        type={type !== "password" ? type : (showPassword ? "text" : "password")}
        value={value}
        // --- FIX: Use new theme colors ---
        className="w-full h-12 pl-12 pr-4 text-neutral-900 dark:text-neutral-200 bg-white dark:bg-neutral-800 text-sm p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        placeholder={placeholder}
        onChange={(e) =>
          setUserData((prev) => ({
            ...prev,
            [field]: e.target.value,
          }))
        }
      />
      {type === "password" && (
        <i
          onClick={() => setShowPassword((prev) => !prev)}
          className={`fi ${
            showPassword ? " fi-rs-eye " : " fi-rs-crossed-eye "
          }  absolute top-1/2 -translate-y-1/2 mt-1 right-4 text-neutral-500 cursor-pointer`}
        ></i>
      )}
    </div>
  );
}

export default Input;