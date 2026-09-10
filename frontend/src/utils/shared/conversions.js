export function cssVar(cssVariableName) {
  return getComputedStyle(document.documentElement).getPropertyValue(cssVariableName).trim();
}

export function kmhToMPerS(speedValue) {
  return speedValue / 3.6;
}

export function mPerSToKmh(speedValue) {
  return speedValue * 3.6;
}
