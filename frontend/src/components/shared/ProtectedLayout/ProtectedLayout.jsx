import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import Layout from "../Layout/Layout";
import { getSession } from "../../../api/authorizationApi";
import { toSessionResponse } from "../../../utils/shared/authorizationMapper";

export default function ProtectedLayout() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function checkSession() {
      try {
        const session = toSessionResponse(await getSession());
        if (!isActive) {
          return;
        }

        setIsAuthenticated(Boolean(session.authenticated));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    checkSession();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <Layout />;
}
