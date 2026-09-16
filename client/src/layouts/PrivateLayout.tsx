import { HomeOutlined, LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Tooltip, Typography } from "antd";
import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

const { Text } = Typography;

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showContent, setShowContent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      navigate("/login");
    } else {
      setShowContent(true);
    }
  }, []);

  const signOut = () => {
    Cookies.remove("token");
    navigate("/login");
  };

  return (
    showContent && (
      <div className="min-h-screen bg-[#f7f9fc]">
        <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between">
            <Link to="/" className="flex items-center gap-3 no-underline">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-base font-bold text-white shadow-md shadow-blue-200">
                B
              </div>
              <Text strong className="!text-lg !text-slate-800">
                Blogspace
              </Text>
            </Link>

            <div className="flex items-center gap-1">
              <NavLink to="/" end>
                {({ isActive }) => (
                  <Tooltip title="Home">
                    <Button
                      type={isActive ? "primary" : "text"}
                      shape="circle"
                      icon={<HomeOutlined />}
                      aria-label="Home"
                    />
                  </Tooltip>
                )}
              </NavLink>
              <NavLink to="/profile">
                {({ isActive }) => (
                  <Tooltip title="Profile">
                    <Button
                      type={isActive ? "primary" : "text"}
                      shape="circle"
                      icon={<UserOutlined />}
                      aria-label="Profile"
                    />
                  </Tooltip>
                )}
              </NavLink>
              <Tooltip title="Sign out">
                <Button
                  type="text"
                  shape="circle"
                  icon={<LogoutOutlined />}
                  onClick={signOut}
                  aria-label="Sign out"
                />
              </Tooltip>
            </div>
          </div>
        </header>
        {children}
      </div>
    )
  );
}
