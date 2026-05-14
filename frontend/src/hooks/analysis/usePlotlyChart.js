import { useEffect } from "react";
import Plotly from "plotly.js-dist-min";

export default function usePlotlyChart({
  containerRef,
  traces,
  layout,
  config,
  enabled = true,
  events = [],
}) {
  useEffect(() => {
    const node = containerRef.current;
    if (!enabled || !node || !traces) return undefined;

    Plotly.react(node, traces, layout, config);

    events.forEach(({ name, handler }) => {
      if (name && typeof handler === "function") node.on(name, handler);
    });

    const resizeObserver = new ResizeObserver(() => Plotly.Plots.resize(node));
    resizeObserver.observe(node);

    return () => {
      events.forEach(({ name, handler }) => {
        if (name && typeof handler === "function" && typeof node.removeListener === "function") {
          node.removeListener(name, handler);
        }
      });
      resizeObserver.disconnect();
    };
  }, [containerRef, traces, layout, config, enabled, events]);
}
