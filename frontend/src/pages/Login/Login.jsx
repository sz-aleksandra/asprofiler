import { useState } from "react";
import headerStyles from "../../components/Header/Header.module.css";
import filesListStyles from "../FilesList/FilesList.module.css";
import styles from "./Login.module.css";

export default function Login({ error = "", isLoading = false, onSubmit }) {
  const [inputValue, setInputValue] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    const didUnlock = await onSubmit(inputValue);
    if (didUnlock) {
      setInputValue("");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={headerStyles.brand}>
          <span className={headerStyles.accent}>AS</span>
          Profiler
        </div>
        <h1 className={styles.title}>Password protected access</h1>

        {isLoading ? null : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={filesListStyles.controlLabel}>
              Password
              <input
                autoComplete="current-password"
                className={filesListStyles.controlInput}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Enter password"
                type="password"
                value={inputValue}
              />
            </label>
            {error ? <p className={styles.error}>{error}</p> : null}
            <button className={`${filesListStyles.dangerBtn} ${styles.loginButton}`} type="submit">
              Unlock
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
