import { createBrowserRouter } from "react-router-dom";
import Login from "../pages/auth/login";
import Register from "../pages/auth/register";
import About from "../pages/About";
import Home from "../pages/private/Home";
import Profile from "../pages/private/Profile";
import PrivateLayout from "../layouts/PrivateLayout";
import PublicLayout from "../layouts/PublicLayout";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <PrivateLayout>
        <Home />
      </PrivateLayout>
    ),
  },
  {
    path: "/profile",
    element: (
      <PrivateLayout>
        <Profile />
      </PrivateLayout>
    ),
  },
  {
    path: "/about",
    element: (
      <PrivateLayout>
        <About />
      </PrivateLayout>
    ),
  },
  {
    path: "/login",
    element: (
      <PublicLayout>
        <Login />
      </PublicLayout>
    ),
  },
  {
    path: "/register",
    element: (
      <PublicLayout>
        <Register />
      </PublicLayout>
    ),
  },
]);

export default router;
