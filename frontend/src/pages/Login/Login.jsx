import { useState } from "react";

import Button from "../../ui/Button/Button";
import Input from "../../ui/form/controls/Input/Input";

import headerStyles from "../../components/shared/Header/Header.module.css";
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
              <Input
                type="password"
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Enter password"
                value={inputValue}
              />
            </label>
            {error ? <p className={styles.error}>{error}</p> : null}
            <Button variant="primary" type="submit" className={styles.loginButton}>
              Unlock
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
