export function computeStats(values) {
  if (!values.length) {
    return { min: null, mean: null, median: null, max: null };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middleIndex = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[middleIndex - 1] + sorted[middleIndex]) / 2
      : sorted[middleIndex];
  return {
    min: sorted[0],
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    median,
    max: sorted[sorted.length - 1],
  };
}

export function computeArea(times, values) {
  if (times.length < 2 || values.length < 2) return 0;
  let area = 0;
  for (let index = 1; index < Math.min(times.length, values.length); index += 1) {
    const t0 = Number(times[index - 1]);
    const t1 = Number(times[index]);
    const v0 = Number(values[index - 1]);
    const v1 = Number(values[index]);
    if (
      !Number.isFinite(t0) ||
      !Number.isFinite(t1) ||
      !Number.isFinite(v0) ||
      !Number.isFinite(v1)
    )
      continue;
    area += ((v0 + v1) / 2) * (t1 - t0);
  }
  return area;
}

export function scaleStatValues(values, multiplier) {
  if (!values) return values;
  const scaleValue = (value) =>
    value === undefined || value === null || Number.isNaN(value)
      ? value
      : Number(value) * multiplier;
  return {
    ...values,
    min: scaleValue(values.min),
    mean: scaleValue(values.mean),
    median: scaleValue(values.median),
    max: scaleValue(values.max),
    area: scaleValue(values.area),
  };
}

export function metricUnits(metric) {
  if (metric === "speed") return { value: "m/s", area: "km" };
  if (metric === "acceleration") return { value: "m/s²", area: "m/s" };
  if (metric === "deceleration") return { value: "m/s²", area: "m/s" };
  if (metric === "force_acceleration") return { value: "N", area: "N x s" };
  if (metric === "force_deceleration") return { value: "N", area: "N x s" };
  return { value: "", area: null };
}
