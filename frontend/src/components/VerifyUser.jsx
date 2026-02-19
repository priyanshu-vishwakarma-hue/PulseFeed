import axios from "axios";
import  { useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { getApiBaseUrl } from "../utils/network";

function VerifyUser() {
  const { verificationToken } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    async function verifyUser() {
      try {
        const res = await axios.get(`${getApiBaseUrl()}/verify-email/${verificationToken}`);

        toast.success(res.data.message);
      } catch (error) {
        toast.error(error.response.data.message);
      } finally {
        navigate("/signin");
      }
    }
    verifyUser();
  }, [verificationToken, navigate]); // Added navigate
  return <div>VerifyUser</div>;
}

export default VerifyUser;
