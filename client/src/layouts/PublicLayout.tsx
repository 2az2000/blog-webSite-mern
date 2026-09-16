import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

/** Layout for pages that do not require an authenticated session. */
export default function PublicLayout({children}: {children: React.ReactNode}) {
  const [showContent, setShowContent] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const token = Cookies.get("token");
    if (token) {
      navigate("/");
    } else {
      setShowContent(true);
    }
  }, []);
  return showContent && <>{children}</> 
}
