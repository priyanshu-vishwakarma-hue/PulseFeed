import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { login as loginAction } from "../utils/userSilce";
import Input from "../components/Input";
import googleIcon from "../assets/google-icon-logo-svgrepo-com.svg";
import { googleAuth, handleRedirectResult } from "../utils/firebase";
import logo from "/logo.svg";

function AuthForm({ type }) {
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const endpointBase = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

  async function handleAuthForm(e) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = `${endpointBase}/${type}`;
      const payload =
        type === "signup"
          ? { name: userData.name, email: userData.email, password: userData.password }
          : { email: userData.email, password: userData.password };

      const res = await axios.post(url, payload, { timeout: 10000 });
      const data = res?.data;

      if (!data) {
        toast.error("No response from server.");
        return;
      }

      if (type === "signup") {
        if (data.success) {
          toast.success(data.message || "Registered successfully. Check your email to verify.");
          setUserData({ name: "", email: "", password: "" });
          navigate("/signin");
        } else {
          toast.error(data.message || "Registration failed");
        }
        return;
      }

      if (type === "signin") {
        if (data.success && data.user) {
          dispatch(loginAction(data.user));
          toast.success(data.message || "Logged in successfully");
          setUserData({ name: "", email: "", password: "" });
          navigate("/");
        } else {
          toast.error(data.message || "Login failed");
        }
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Server not reachable";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleAuth() {
    try {
      const firebaseUser = await googleAuth();
      if (!firebaseUser) return;

      const idToken = await firebaseUser.getIdToken();
      const res = await axios.post(`${endpointBase}/google-auth`, { accessToken: idToken }, { timeout: 10000 });
      const data = res?.data;

      if (data?.success && data.user) {
        dispatch(loginAction(data.user));
        toast.success(data.message || "Authenticated");
        navigate("/");
      } else {
        toast.error(data?.message || "Google authentication failed");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Google authentication failed";
      toast.error(msg);
    }
  }

  useEffect(() => {
    let mounted = true;
    const handleRedirect = async () => {
      try {
        const firebaseUser = await handleRedirectResult();
        if (!mounted || !firebaseUser) return;

        const idToken = await firebaseUser.getIdToken();
        const res = await axios.post(`${endpointBase}/google-auth`, { accessToken: idToken }, { timeout: 10000 });
        const data = res?.data;

        if (data?.success && data.user) {
          dispatch(loginAction(data.user));
          toast.success(data.message || "Authenticated");
          navigate("/");
        } else {
          toast.error(data?.message || "Google authentication failed");
        }
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || "Authentication failed";
        toast.error(msg);
      }
    };
    handleRedirect();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, navigate]);

  return (
    <div className="w-full h-[calc(100vh_-_80px)] flex items-center p-4 justify-center">
      {/* --- FIX: Card background color --- */}
      <div className="bg-white dark:bg-neutral-900 p-8 rounded-lg shadow-md mx-auto w-full max-w-md flex flex-col items-center justify-center gap-6 border border-neutral-200 dark:border-neutral-800">
        <Link to="/">
          <img src={logo} alt="logo" className="h-10 w-auto" />
        </Link>
        
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          {type === "signin" ? "Log in to your account" : "Create a new account"}
        </h1>

        <button
          onClick={handleGoogleAuth}
          className="w-full flex gap-3 items-center justify-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 py-3 px-4 rounded-md"
        >
          <img className="w-6 h-6" src={googleIcon} alt="google" />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Continue with Google</span>
        </button>

        <div className="relative w-full">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-300 dark:border-neutral-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white dark:bg-neutral-900 px-2 text-neutral-500">OR</span>
          </div>
        </div>

        <form className="w-full flex flex-col items-center gap-4" onSubmit={handleAuthForm}>
          {type === "signup" && (
            <Input
              type="text"
              placeholder="Full Name"
              setUserData={setUserData}
              field="name"
              value={userData.name}
              icon="fi-br-user"
            />
          )}
          <Input
            type="email"
            placeholder="Email Address"
            setUserData={setUserData}
            field="email"
            value={userData.email}
            icon="fi-rr-at"
          />
          <Input
            type="password"
            placeholder="Password"
            setUserData={setUserData}
            field="password"
            value={userData.password}
            icon="fi-rr-lock"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full h-12 text-white text-sm font-medium p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
              isSubmitting ? "bg-primary-300 cursor-not-allowed" : "bg-primary-600 hover:bg-primary-700"
            }`}
          >
            {isSubmitting ? "Please wait..." : (type === "signin" ? "Log In" : "Create Account")}
          </button>
        </form>

        {type === "signin" ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Don&apos;t have an account? <Link to={"/signup"} className="text-primary-600 font-medium hover:underline">Sign up</Link> 
          </p>
        ) : (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Already have an account? <Link to={"/signin"} className="text-primary-600 font-medium hover:underline">Log in</Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default AuthForm;