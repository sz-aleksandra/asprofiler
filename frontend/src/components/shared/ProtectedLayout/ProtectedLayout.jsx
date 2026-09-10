import { Navigate, useLocation } from "react-router-dom";

import useSession from "../../../hooks/shared/useSession";
import Layout from "../Layout/Layout";

export default function ProtectedLayout() {
  const location = useLocation();
  const { isSessionLoading, isSessionAuthenticated } = useSession();

  if (isSessionLoading) return null;
  if (!isSessionAuthenticated) return <Navigate replace state={{ from: location }} to="/login" />;
  return <Layout />;
}
