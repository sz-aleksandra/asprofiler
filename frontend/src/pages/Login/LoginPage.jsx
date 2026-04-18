import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Login from "./Login";
import { getSession, login } from "../../services/filesApi";

function resolveRedirectTarget(locationState) {
  const candidate = locationState?.from?.pathname;
  return candidate && candidate !== "/login" ? candidate : "/about";
}

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function checkSession() {
      try {
        const session = await getSession();
        if (!isActive) {
          return;
        }

        setIsAuthenticated(Boolean(session.authenticated));
      } catch {
        if (!isActive) {
          return;
        }

        setError("Could not connect to the backend.");
      } finally {
        if (isActive) {
          setIsCheckingSession(false);
        }
      }
    }

    checkSession();

    return () => {
      isActive = false;
    };
  }, []);

  async function handleLogin(password) {
    setError("");

    try {
      await login(password);
      navigate(resolveRedirectTarget(location.state), { replace: true });
      return true;
    } catch (loginError) {
      if (loginError.status === 401) {
        setError("Invalid password.");
        return false;
      }

      setError("Login failed.");
      return false;
    }
  }

  if (!isCheckingSession && isAuthenticated) {
    return <Navigate replace to={resolveRedirectTarget(location.state)} />;
  }

  return <Login error={error} isLoading={isCheckingSession} onSubmit={handleLogin} />;
}
