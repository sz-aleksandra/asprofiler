import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { loginWithPassword } from "../../api/authApi";
import Brand from "../../components/shared/Brand/Brand";
import useSession from "../../hooks/shared/useSession";
import Button from "../../ui/Button/Button";
import Input from "../../ui/form/controls/Input/Input";

import styles from "./Login.module.css";
export default function Login() {
  const navigate = useNavigate();
  const { getSessionErrorMessage, isSessionLoading, isSessionAuthenticated } = useSession();
  const [password, setPassword] = useState("");
  const [loginErrorMessage, setLoginErrorMessage] = useState("");
  const loginOrSessionErrorMessage = loginErrorMessage || getSessionErrorMessage;
  async function handleLoginSubmit(loginSubmitEvent) {
    loginSubmitEvent.preventDefault();
    setLoginErrorMessage("");
    try {
      await loginWithPassword(password);
      navigate("/files", {
        replace: true,
      });
    } catch (error) {
      if (error.status === 401) {
        setLoginErrorMessage("Invalid password.");
        return;
      }
      setLoginErrorMessage("Login failed.");
    }
  }
  if (isSessionLoading) return null;
  if (isSessionAuthenticated) {
    return <Navigate replace to="/files" />;
  }
  return (
    <div className={styles.loginPage}>
      <div className={styles.card}>
        <Brand />
        <h1 className={styles.title}>Password protected access</h1>

        <form className={styles.form} onSubmit={handleLoginSubmit}>
          <label>
            Password
            <Input
              type="password"
              autoComplete="current-password"
              onChange={(passwordChangeEvent) => setPassword(passwordChangeEvent.target.value)}
              placeholder="Enter password"
              value={password}
            />
          </label>
          {loginOrSessionErrorMessage ? (
            <p className={styles.error}>{loginOrSessionErrorMessage}</p>
          ) : null}
          <Button type="submit" buttonVariant="primary">
            Unlock
          </Button>
        </form>
      </div>
    </div>
  );
}
