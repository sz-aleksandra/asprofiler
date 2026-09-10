import styles from "./Button.module.css";

const BUTTON_VARIANT_CLASS_NAMES = {
  primary: styles.primary,
  primaryOutline: styles.primaryOutline,
  ghost: styles.ghost,
};

export default function Button({ buttonVariant, buttonClassName, children, ...buttonProps }) {
  const buttonVariantClassName = BUTTON_VARIANT_CLASS_NAMES[buttonVariant] || styles.primary;

  return (
    <button
      className={`${styles.button} ${buttonVariantClassName}${buttonClassName ? ` ${buttonClassName}` : ""}`}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
