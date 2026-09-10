import { useEffect } from "react";

import Button from "../Button/Button";

import styles from "./Toast.module.css";
const TOAST_VARIANT_CLASS_NAMES = {
  success: styles.success,
  error: styles.error,
};
export default function Toast({ toastMessage, onCloseToast, toastVariant }) {
  useEffect(() => {
    if (!toastMessage) return;
    const autoCloseTimeoutId = setTimeout(onCloseToast, 3000);
    return () => clearTimeout(autoCloseTimeoutId);
  }, [toastMessage, onCloseToast]);
  if (!toastMessage) return null;
  const toastVariantClassName = TOAST_VARIANT_CLASS_NAMES[toastVariant] || "";
  return (
    <div className={`${styles.toast} ${toastVariantClassName}`}>
      <span className={styles.message}>{toastMessage}</span>
      <Button type="button" buttonVariant="ghost" onClick={onCloseToast}>
        x
      </Button>
    </div>
  );
}
