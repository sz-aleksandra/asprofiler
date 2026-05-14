import { useCallback, useEffect, useMemo, useRef } from "react";
import Plotly from "plotly.js-dist-min";

import usePlotlyChart from "../../../hooks/analysis/usePlotlyChart";
import styles from "./TimeSeriesChart.module.css";
import { getCssVar } from "../../../utils/shared/getCssVar";
import { hexToRgba } from "../../../utils/shared/hexToRgba";
import { getContextWindowPoints } from "../../../utils/analysis/selectionWindow";

function buildTickConfig(referenceX, referenceLabels, xTickFormatter, minX, maxX) {
  if (typeof xTickFormatter !== "function" || !Array.isArray(referenceX) || referenceX.length === 0) {
    return null;
  }

  const points = referenceX
    .map((value, index) => ({ value: Number(value), index }))
    .filter(({ value }) => Number.isFinite(value))
    .filter(({ value }) =>
      Number.isFinite(minX) && Number.isFinite(maxX) ? value >= minX && value <= maxX : true,
    );

  const sourceIndexes = (
    points.length ? points : referenceX.map((value, index) => ({ value, index }))
  ).map(({ index }) => index);
  if (!sourceIndexes.length) return null;

  const maxTicks = Math.min(10, sourceIndexes.length);
  const tickIndexes = Array.from(
    { length: maxTicks },
    (_, tickIndex) =>
      sourceIndexes[
        Math.round((tickIndex * (sourceIndexes.length - 1)) / Math.max(maxTicks - 1, 1))
      ],
  );
  const uniqueIndexes = [...new Set(tickIndexes)];
  const tickvals = uniqueIndexes.map((sourceIndex) => Number(referenceX[sourceIndex]));
  const ticktext = uniqueIndexes.map((sourceIndex) =>
    xTickFormatter(Number(referenceX[sourceIndex]), referenceLabels?.[sourceIndex], sourceIndex),
  );

  return {
    tickmode: "array",
    tickvals,
    ticktext,
    signature: JSON.stringify([tickvals, ticktext]),
  };
}

export default function TimeSeriesChart({
  title,
  yTitle,
  time,
  series,
  valueLabelFormatter,
  xTitle = "Time series",
  xIncludeZero = false,
  xTickFormatter,
  xHoverFormatter,
  selectedPoints,
  pointsBefore = 10,
  pointsAfter = 10,
  yReferenceLines = [],
}) {
  const containerRef = useRef(null);
  const applyingTicksRef = useRef(false);
  const lastTickSignatureRef = useRef("");
  const cssBlack = getCssVar("--black");

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
      if (xValue === undefined || xValue === null || Number.isNaN(Number(xValue))) return "-";
      return String(xValue);
    };
    const next = series
      .filter((seriesItem) => {
        const xValues = seriesItem.x || time;
        return xValues?.length && seriesItem.values?.length;
      })
      .map((seriesItem) => {
        const baseColor = seriesItem.color;
        const labels = Array.isArray(seriesItem.labels) ? seriesItem.labels : [];
        const xValues = seriesItem.x || time;
        return {
          name: seriesItem.name,
          type: "scattergl",
          mode: "lines",
          x: xValues,
          y: seriesItem.values,
          customdata: xValues.map((xValue, index) => {
            const yValue = seriesItem.values[index];
            const valueLabel =
              typeof valueLabelFormatter === "function"
                ? valueLabelFormatter(yValue, seriesItem, index)
                : "Value";
            return [getHoverTimeLabel(xValue, labels[index] || "", index), valueLabel];
          }),
          hovertemplate:
            "Time: %{customdata[0]}<br>%{customdata[1]}: %{y:.3f}<extra>%{fullData.name}</extra>",
          line: { color: hexToRgba(baseColor, 0.4), width: 1.5 },
        };
      });
    if (!next.length) return null;

    const selections = (selectedPoints || []).filter(
      (point) => point?.name && Number.isInteger(Number(point?.index)),
    );
    const shapes = [];
    const selectedIndexBySeries = new Map();
    if (selections.length > 0) {
      selections.forEach((selection) => {
        const selectedName = selection.name;
        const selectedIndex = Number(selection.index);
        const indexSet = selectedIndexBySeries.get(selectedName) || new Set();
        indexSet.add(selectedIndex);
        selectedIndexBySeries.set(selectedName, indexSet);
        const target = series.find((seriesItem) => seriesItem.name === selectedName);
        const xData = target?.x || time;
        const yData = target?.values;
        if (
          !xData?.length ||
          !yData?.length ||
          selectedIndex < 0 ||
          selectedIndex >= xData.length
        ) {
          return;
        }
        const centerTime = Number(xData[selectedIndex]);
        if (Number.isFinite(centerTime)) {
          shapes.push({
            type: "line",
            xref: "x",
            yref: "paper",
            x0: centerTime,
            x1: centerTime,
            y0: 0,
            y1: 1,
            line: {
              color: target?.color || hexToRgba(cssBlack, 0.75),
              width: 2,
              dash: "dot",
            },
          });
        }

        const pointWindow = getContextWindowPoints(
          xData.map((xValue, index) => ({ index, xValue, yValue: yData[index] })),
          selectedIndex,
          pointsBefore,
          pointsAfter,
        );
        if (pointWindow.length > 1) {
          const selectedSet = selectedIndexBySeries.get(selectedName) || new Set();
          const markerSizes = pointWindow.map((point) => (selectedSet.has(point.index) ? 0 : 7));
          const labelWindow = pointWindow.map((point) => target?.labels?.[point.index] || "");
          next.push({
            name: `${selectedName} context`,
            type: "scatter",
            mode: "lines+markers",
            x: pointWindow.map((point) => point.xValue),
            y: pointWindow.map((point) => point.yValue),
            customdata: pointWindow.map((point, index) => {
              const valueLabel =
                typeof valueLabelFormatter === "function"
                  ? valueLabelFormatter(point.yValue, target, point.index)
                  : "Value";
              return [
                getHoverTimeLabel(point.xValue, labelWindow[index] || "", point.index),
                valueLabel,
              ];
            }),
            hovertemplate:
              "Time: %{customdata[0]}<br>%{customdata[1]}: %{y:.3f}<extra>%{fullData.name}</extra>",
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
          customdata: [
            [
              getHoverTimeLabel(
                xData[selectedIndex],
                target?.labels?.[selectedIndex] || "",
                selectedIndex,
              ),
              typeof valueLabelFormatter === "function"
                ? valueLabelFormatter(yData[selectedIndex], target, selectedIndex)
                : "Value",
            ],
          ],
          hovertemplate:
            "Time: %{customdata[0]}<br>%{customdata[1]}: %{y:.3f}<extra>%{fullData.name}</extra>",
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
      .filter((seriesItem) => (seriesItem.x || time)?.length)
      .sort(
        (firstSeries, secondSeries) =>
          ((secondSeries.x || time)?.length || 0) - ((firstSeries.x || time)?.length || 0),
      )[0];

    return {
      traces: next,
      shapes: [...shapes, ...refShapes],
      referenceX: referenceSeries?.x || time || [],
      referenceLabels: referenceSeries?.labels || [],
    };
  }, [
    time,
    series,
    selectedPoints,
    pointsBefore,
    pointsAfter,
    cssBlack,
    yReferenceLines,
    xTickFormatter,
    xHoverFormatter,
    valueLabelFormatter,
  ]);

  const layout = useMemo(() => {
    if (!plotData) return null;
    const nextLayout = {
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

    const initialTickConfig = buildTickConfig(
      plotData.referenceX,
      plotData.referenceLabels,
      xTickFormatter,
    );
    if (initialTickConfig) {
      nextLayout.xaxis.tickmode = initialTickConfig.tickmode;
      nextLayout.xaxis.tickvals = initialTickConfig.tickvals;
      nextLayout.xaxis.ticktext = initialTickConfig.ticktext;
    }

    return nextLayout;
  }, [plotData, title, xTitle, yTitle, xTickFormatter, xIncludeZero, cssBlack]);

  useEffect(() => {
    const initialTickConfig = buildTickConfig(
      plotData?.referenceX,
      plotData?.referenceLabels,
      xTickFormatter,
    );
    lastTickSignatureRef.current = initialTickConfig?.signature || "";
  }, [plotData, xTickFormatter]);

  const onRelayout = useCallback(
    (event) => {
      const node = containerRef.current;
      if (!node) return;

      if (applyingTicksRef.current) {
        applyingTicksRef.current = false;
        return;
      }

      if (typeof xTickFormatter !== "function") return;

      const minX = Number(event?.["xaxis.range[0]"]);
      const maxX = Number(event?.["xaxis.range[1]"]);
      const nextTickConfig =
        event?.["xaxis.autorange"] === true
          ? buildTickConfig(plotData.referenceX, plotData.referenceLabels, xTickFormatter)
          : buildTickConfig(plotData.referenceX, plotData.referenceLabels, xTickFormatter, minX, maxX);

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
    },
    [containerRef, plotData, xTickFormatter],
  );
  const config = useMemo(() => ({ responsive: true, displayModeBar: true }), []);
  const events = useMemo(
    () => [{ name: "plotly_relayout", handler: onRelayout }],
    [onRelayout],
  );
  usePlotlyChart({
    containerRef,
    traces: plotData?.traces,
    layout,
    config,
    enabled: Boolean(plotData),
    events,
  });

  if (!plotData) return null;

  return <div className={styles.chart} ref={containerRef} />;
}
