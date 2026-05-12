import styles from "./Input.module.css";

const SIZE_DEFAULTS = { number: "sm", password: "md", text: "md" };

export default function Input({ type = "text", size, className, ...props }) {
  const resolvedSize = size ?? SIZE_DEFAULTS[type] ?? "md";
  return (
    <input
      type={type}
      autoComplete={type === "password" ? "current-password" : undefined}
      className={`${styles.input} ${styles[resolvedSize]}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
