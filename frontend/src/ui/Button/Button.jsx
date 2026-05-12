import styles from "./Button.module.css";

export default function Button({
  variant = "primary",
  type = "button",
  className,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={`${styles.btn} ${styles[variant]}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {children}
    </button>
  );
}
