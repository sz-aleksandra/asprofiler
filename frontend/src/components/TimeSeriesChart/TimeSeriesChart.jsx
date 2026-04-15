import { useEffect, useMemo, useRef } from "react";
import Plotly from "plotly.js-dist-min";

import styles from "./TimeSeriesChart.module.css";
import { getCssVar } from "../../utils/getCssVar";
import { hexToRgba } from "../../utils/hexToRgba";

export default function TimeSeriesChart({
  title,
  yTitle,
  time,
  series,
  xTitle = "Time series",
  xIncludeZero = false,
  xTickFormatter,
  xHoverFormatter,
  selectedPoints,
  pointWindow,
  timeWindowSec,
  yReferenceLines = [],
}) {
  const containerRef = useRef(null);
  const applyingTicksRef = useRef(false);
  const lastTickSignatureRef = useRef("");
  const cssBlack = getCssVar("--black");
  const buildTickConfig = (referenceX, referenceLabels, minX, maxX) => {
    if (
      typeof xTickFormatter !== "function" ||
      !Array.isArray(referenceX) ||
      referenceX.length === 0
    ) {
      return null;
    }

    const points = referenceX
      .map((value, index) => ({ value: Number(value), index }))
      .filter(({ value }) => Number.isFinite(value))
      .filter(({ value }) =>
        Number.isFinite(minX) && Number.isFinite(maxX) ? value >= minX && value <= maxX : true,
      );

    const sourceIndexes = (points.length ? points : referenceX.map((value, index) => ({ value, index }))).map(
      ({ index }) => index,
    );
    if (!sourceIndexes.length) return null;

    const maxTicks = Math.min(10, sourceIndexes.length);
    const tickIndexes = Array.from(
      { length: maxTicks },
      (_, idx) =>
        sourceIndexes[Math.round((idx * (sourceIndexes.length - 1)) / Math.max(maxTicks - 1, 1))],
    );
    const uniqueIndexes = [...new Set(tickIndexes)];
    const tickvals = uniqueIndexes.map((idx) => Number(referenceX[idx]));
    const ticktext = uniqueIndexes.map((idx) =>
      xTickFormatter(Number(referenceX[idx]), referenceLabels?.[idx], idx),
    );

    return {
      tickmode: "array",
      tickvals,
      ticktext,
      signature: JSON.stringify([tickvals, ticktext]),
    };
  };

  const plotData = useMemo(() => {
    if (!series?.length) return null;
    const getHoverTimeLabel = (xValue, label, index) => {
      if (typeof xHoverFormatter === "function") {
        return xHoverFormatter(Number(xValue), label, index);
      }
      if (typeof xTickFormatter === "function") {
        return xTickFormatter(Number(xValue), label, index);
      }
      if (label) return label;
      if (xValue === undefined || xValue === null || Number.isNaN(Number(xValue))) return "—";
      return String(xValue);
    };
    const next = series
      .filter((s) => {
        const x = s.x || time;
        return x?.length && s.values?.length;
      })
      .map((s) => {
        const baseColor = s.color;
        const labels = Array.isArray(s.labels) ? s.labels : [];
        const xValues = s.x || time;
        return {
          name: s.name,
          type: "scattergl",
          mode: "lines",
          x: xValues,
          y: s.values,
          customdata: xValues.map((xValue, index) => [
            getHoverTimeLabel(xValue, labels[index] || "", index),
          ]),
          hovertemplate: "Time: %{customdata[0]}<br>Value: %{y:.3f}<extra>%{fullData.name}</extra>",
          line: { color: hexToRgba(baseColor, 0.4), width: 1.5 },
        };
      });
    if (!next.length) return null;

    const selections = (selectedPoints || []).filter(
      (p) => p?.name && Number.isInteger(Number(p?.index)),
    );
    const shapes = [];
    const selectedIndexBySeries = new Map();
    if (selections.length > 0) {
      selections.forEach((sel) => {
        const selectedName = sel.name;
        const selectedIndex = Number(sel.index);
        const indexSet = selectedIndexBySeries.get(selectedName) || new Set();
        indexSet.add(selectedIndex);
        selectedIndexBySeries.set(selectedName, indexSet);
        const target = series.find((s) => s.name === selectedName);
        const xData = target?.x || time;
        const yData = target?.values;
        if (!xData?.length || !yData?.length || selectedIndex < 0 || selectedIndex >= xData.length) {
          return;
        }
        const centerTime = Number(xData[selectedIndex]);
        if (Number.isFinite(centerTime)) {
          const windowFrom = centerTime - timeWindowSec;
          const windowTo = centerTime + timeWindowSec;
          shapes.push(
            {
              type: "rect",
              xref: "x",
              yref: "paper",
              x0: windowFrom,
              x1: windowTo,
              y0: 0,
              y1: 1,
              fillcolor: hexToRgba(cssBlack, 0.05),
              line: { width: 0 },
              layer: "below",
            },
            {
              type: "line",
              xref: "x",
              yref: "paper",
              x0: centerTime,
              x1: centerTime,
              y0: 0,
              y1: 1,
              line: { color: hexToRgba(cssBlack, 0.5), width: 2 },
            },
          );
        }

        const pFrom = Math.max(0, selectedIndex - pointWindow);
        const pTo = Math.min(xData.length - 1, selectedIndex + pointWindow);
        const xWindow = xData.slice(pFrom, pTo + 1);
        const yWindow = yData.slice(pFrom, pTo + 1);
        if (xWindow.length > 1) {
          const selectedSet = selectedIndexBySeries.get(selectedName) || new Set();
          const markerSizes = xWindow.map((_, i) => (selectedSet.has(pFrom + i) ? 0 : 7));
          const labelWindow = target?.labels?.slice(pFrom, pTo + 1) || [];
          next.push({
            name: `${selectedName} context`,
            type: "scatter",
            mode: "lines+markers",
            x: xWindow,
            y: yWindow,
            customdata: xWindow.map((xValue, index) => [
              getHoverTimeLabel(xValue, labelWindow[index] || "", pFrom + index),
            ]),
            hovertemplate: "Time: %{customdata[0]}<br>Value: %{y:.3f}<extra>%{fullData.name}</extra>",
            line: { color: target?.color, width: 2 },
            marker: {
              size: markerSizes,
              color: target?.color,
              line: { width: 0 },
            },
            showlegend: false,
          });
        }
        next.push({
          name: `${selectedName} selected`,
          type: "scatter",
          mode: "markers",
          x: [xData[selectedIndex]],
          y: [yData[selectedIndex]],
          customdata: [[
            getHoverTimeLabel(
              xData[selectedIndex],
              target?.labels?.[selectedIndex] || "",
              selectedIndex,
            ),
          ]],
          hovertemplate: "Time: %{customdata[0]}<br>Value: %{y:.3f}<extra>%{fullData.name}</extra>",
          marker: {
            size: 7,
            color: target?.color,
            symbol: "diamond",
            line: { width: 0 },
          },
          showlegend: false,
        });
      });
    }

    const refShapes = (yReferenceLines || [])
      .filter((line) => Number.isFinite(Number(line?.y)))
      .map((line) => ({
        type: "line",
        xref: "paper",
        yref: "y",
        x0: 0,
        x1: 1,
        y0: Number(line.y),
        y1: Number(line.y),
        line: {
          color: line.color || cssBlack,
          width: Number.isFinite(Number(line.width)) ? Number(line.width) : 1.5,
          dash: line.dash || "dash",
        },
      }));

    const referenceSeries = [...series]
      .filter((s) => (s.x || time)?.length)
      .sort((a, b) => ((b.x || time)?.length || 0) - ((a.x || time)?.length || 0))[0];

    return {
      traces: next,
      shapes: [...shapes, ...refShapes],
      referenceX: referenceSeries?.x || time || [],
      referenceLabels: referenceSeries?.labels || [],
    };
  }, [time, series, selectedPoints, pointWindow, timeWindowSec, cssBlack, yReferenceLines, xTickFormatter, xHoverFormatter]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const node = containerRef.current;
    if (!plotData) return undefined;
    const layout = {
      title: { text: title, font: { color: cssBlack } },
      font: { color: cssBlack },
      uirevision: title,
      margin: { l: 50, r: 20, t: 40, b: 110 },
      xaxis: {
        title: { text: xTitle, font: { color: cssBlack } },
        tickfont: { color: cssBlack },
        type: "linear",
        rangemode: xIncludeZero ? "tozero" : undefined,
      },
      yaxis: {
        title: { text: yTitle || title, font: { color: cssBlack } },
        tickfont: { color: cssBlack },
      },
      shapes: plotData.shapes,
      showlegend: true,
      legend: {
        orientation: "h",
        x: 0,
        y: -0.22,
        xanchor: "left",
        yanchor: "top",
        font: { color: cssBlack },
      },
    };

    const initialTickConfig = buildTickConfig(plotData.referenceX, plotData.referenceLabels);
    if (initialTickConfig) {
      lastTickSignatureRef.current = initialTickConfig.signature;
      layout.xaxis.tickmode = initialTickConfig.tickmode;
      layout.xaxis.tickvals = initialTickConfig.tickvals;
      layout.xaxis.ticktext = initialTickConfig.ticktext;
    }

    const config = {
      responsive: true,
      displayModeBar: true,
    };
    Plotly.react(node, plotData.traces, layout, config);

    const onRelayout = (event) => {
      if (applyingTicksRef.current) {
        applyingTicksRef.current = false;
        return;
      }

      if (typeof xTickFormatter !== "function") return;

      const minX = Number(event?.["xaxis.range[0]"]);
      const maxX = Number(event?.["xaxis.range[1]"]);
      const nextTickConfig =
        event?.["xaxis.autorange"] === true
          ? buildTickConfig(plotData.referenceX, plotData.referenceLabels)
          : buildTickConfig(plotData.referenceX, plotData.referenceLabels, minX, maxX);

      if (!nextTickConfig || nextTickConfig.signature === lastTickSignatureRef.current) return;

      lastTickSignatureRef.current = nextTickConfig.signature;
      applyingTicksRef.current = true;
      Plotly.relayout(node, {
        "xaxis.tickmode": nextTickConfig.tickmode,
        "xaxis.tickvals": nextTickConfig.tickvals,
        "xaxis.ticktext": nextTickConfig.ticktext,
      }).catch(() => {
        applyingTicksRef.current = false;
      });
    };
    node.on("plotly_relayout", onRelayout);

    const ro = new ResizeObserver(() => Plotly.Plots.resize(node));
    ro.observe(node);
    return () => {
      if (typeof node.removeListener === "function") {
        node.removeListener("plotly_relayout", onRelayout);
      }
      ro.disconnect();
    };
  }, [plotData, title, xTitle, yTitle, xTickFormatter, xIncludeZero]);

  if (!plotData) return null;

  return <div className={styles.chart} ref={containerRef} />;
}
