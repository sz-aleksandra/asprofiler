import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/react-dom";

import styles from "./HeaderLabel.module.css";
export default function HeaderLabel({ headerTooltipLines, headerText }) {
  if (!headerTooltipLines?.length) {
    return <span className={styles.text}>{headerText}</span>;
  }
  return <HeaderLabelWithTooltip headerText={headerText} headerTooltipLines={headerTooltipLines} />;
}
function HeaderLabelWithTooltip({ headerText, headerTooltipLines }) {
  const {
    refs: { setReference, setFloating },
    floatingStyles,
  } = useFloating({
    placement: "top",
    middleware: [
      offset(8),
      flip(),
      shift({
        padding: 8,
      }),
    ],
    whileElementsMounted: autoUpdate,
  });
  return (
    <span className={styles.headerLabel}>
      <span className={styles.text}>{headerText}</span>
      <span className={styles.helpIcon} ref={setReference}>
        ?
        <span className={styles.tooltipLines} ref={setFloating} style={floatingStyles}>
          {headerTooltipLines.map((headerTooltipLine) => (
            <span className={styles.tooltipLine} key={headerTooltipLine}>
              {headerTooltipLine}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
