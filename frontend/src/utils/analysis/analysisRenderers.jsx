import { useLayoutEffect, useRef, useState } from "react";

export function renderSpeedStatValue(value, styles) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  const v = Number(value);
  return (
    <span className={styles.stackedStatValue}>
      <span>{v.toFixed(2)} m/s</span>
      <span>({(v * 3.6).toFixed(2)} km/h)</span>
    </span>
  );
}

function InfoHeader({ label, tooltipLines, styles }) {
  const tooltipRef = useRef(null);
  const [offsetX, setOffsetX] = useState(0);

  useLayoutEffect(() => {
    const adjust = () => {
      const tip = tooltipRef.current;
      if (!tip) return;
      tip.style.transform = "translateX(-50%)";
      const rect = tip.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      const margin = 8;
      const viewportWidth = window.innerWidth;
      if (rect.right > viewportWidth - margin) {
        setOffsetX(viewportWidth - margin - rect.right);
      } else if (rect.left < margin) {
        setOffsetX(margin - rect.left);
      } else {
        setOffsetX(0);
      }
    };
    const frame = requestAnimationFrame(adjust);
    window.addEventListener("resize", adjust);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", adjust);
    };
  }, []);

  return (
    <span className={styles.statsHeadWithHelp}>
      <span>{label}</span>
      <span className={styles.helpIcon} tabIndex={0}>
        ?
        <span
          ref={tooltipRef}
          className={styles.helpTooltip}
          style={{ transform: `translateX(calc(-50% + ${offsetX}px))` }}
        >
          {tooltipLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </span>
      </span>
    </span>
  );
}

export function renderInfoHeader(label, tooltipLines, styles) {
  return <InfoHeader label={label} tooltipLines={tooltipLines} styles={styles} />;
}
