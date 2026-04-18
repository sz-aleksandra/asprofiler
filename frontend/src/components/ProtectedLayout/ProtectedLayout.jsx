import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import Layout from "../Layout/Layout";
import { getSession } from "../../services/filesApi";

export default function ProtectedLayout() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function checkSession() {
      try {
        const session = await getSession();
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
