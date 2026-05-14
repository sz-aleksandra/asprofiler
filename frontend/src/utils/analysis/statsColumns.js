export function buildStatsColumns({
  styles,
  renderSpeedStatValue,
  formatSpeedWithKmh,
  formatWithUnit,
  formatGpsDuration,
  renderInfoHeader,
  isForceProfile,
  formatDistanceKm,
}) {
  return [
    {
      key: "metric",
      header: "",
      exportHeader: "Metric",
      cellClassName: styles.statsLabel,
      renderCell: (row) => `${row.fileName} ${row.metricLabel}`,
      exportValue: (row) => `${row.fileName} ${row.metricLabel}`,
    },
    {
      key: "min",
      header: "Min",
      exportHeader: "Min",
      cellClassName: styles.statsValue,
      renderCell: (row) =>
        row.metric === "speed"
          ? renderSpeedStatValue(row.values?.min)
          : formatWithUnit(row.values?.min, row.units.value),
      exportValue: (row) =>
        row.metric === "speed"
          ? formatSpeedWithKmh(row.values?.min)
          : formatWithUnit(row.values?.min, row.units.value),
    },
    {
      key: "mean",
      header: "Mean",
      exportHeader: "Mean",
      cellClassName: styles.statsValue,
      renderCell: (row) =>
        row.metric === "speed"
          ? renderSpeedStatValue(row.values?.mean)
          : formatWithUnit(row.values?.mean, row.units.value),
      exportValue: (row) =>
        row.metric === "speed"
          ? formatSpeedWithKmh(row.values?.mean)
          : formatWithUnit(row.values?.mean, row.units.value),
    },
    {
      key: "median",
      header: "Median",
      exportHeader: "Median",
      cellClassName: styles.statsValue,
      renderCell: (row) =>
        row.metric === "speed"
          ? renderSpeedStatValue(row.values?.median)
          : formatWithUnit(row.values?.median, row.units.value),
      exportValue: (row) =>
        row.metric === "speed"
          ? formatSpeedWithKmh(row.values?.median)
          : formatWithUnit(row.values?.median, row.units.value),
    },
    {
      key: "max",
      header: "Max",
      exportHeader: "Max",
      cellClassName: styles.statsValue,
      renderCell: (row) =>
        row.metric === "speed"
          ? renderSpeedStatValue(row.values?.max)
          : formatWithUnit(row.values?.max, row.units.value),
      exportValue: (row) =>
        row.metric === "speed"
          ? formatSpeedWithKmh(row.values?.max)
          : formatWithUnit(row.values?.max, row.units.value),
    },
    {
      key: "duration",
      exportHeader: "Duration",
      renderHeader: () => renderInfoHeader("Duration", ["HH:MM:SS.s"]),
      cellClassName: styles.statsValue,
      renderCell: (row) => formatGpsDuration(row.duration),
      exportValue: (row) => formatGpsDuration(row.duration),
    },
    {
      key: "area",
      cellClassName: styles.statsValue,
      exportHeader: "Area",
      renderHeader: () =>
        renderInfoHeader("Area", [
          "Speed area = total distance.",
          isForceProfile
            ? "Force area = accumulated impulse."
            : "Acceleration area = accumulated speed change.",
        ]),
      renderCell: (row) =>
        row.metric === "speed"
          ? formatDistanceKm(row.values?.area)
          : row.units.area
            ? formatWithUnit(row.values?.area, row.units.area)
            : "-",
      exportValue: (row) =>
        row.metric === "speed"
          ? formatDistanceKm(row.values?.area)
          : row.units.area
            ? formatWithUnit(row.values?.area, row.units.area)
            : "-",
    },
  ];
}
