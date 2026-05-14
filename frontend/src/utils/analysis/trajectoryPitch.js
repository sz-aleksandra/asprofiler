export const PITCH_LENGTH = 105;
export const PITCH_WIDTH = 68;
export const TOUCHLINE_MARGIN = 4;
export const X_OFFSET = PITCH_LENGTH / 2;

const THIRD_LENGTH = PITCH_LENGTH / 3;

export const KEY_X_TICKS = [0, 16.5, X_OFFSET, PITCH_LENGTH - 16.5, PITCH_LENGTH];
export const KEY_Y_TICKS = [-PITCH_WIDTH / 2, -20.16, 0, 20.16, PITCH_WIDTH / 2];

export function buildPitchShapes(cssBlack) {
  return [
    {
      type: "rect",
      x0: 0,
      x1: PITCH_LENGTH,
      y0: -PITCH_WIDTH / 2,
      y1: PITCH_WIDTH / 2,
      line: { color: cssBlack, width: 2 },
    },
    {
      type: "line",
      x0: X_OFFSET,
      x1: X_OFFSET,
      y0: -PITCH_WIDTH / 2,
      y1: PITCH_WIDTH / 2,
      line: { color: cssBlack, width: 1.5 },
    },
    {
      type: "circle",
      x0: X_OFFSET - 9.15,
      x1: X_OFFSET + 9.15,
      y0: -9.15,
      y1: 9.15,
      line: { color: cssBlack, width: 1.5 },
    },
    {
      type: "rect",
      x0: 0,
      x1: 16.5,
      y0: -20.16,
      y1: 20.16,
      line: { color: cssBlack, width: 1.5 },
    },
    {
      type: "rect",
      x0: PITCH_LENGTH - 16.5,
      x1: PITCH_LENGTH,
      y0: -20.16,
      y1: 20.16,
      line: { color: cssBlack, width: 1.5 },
    },
    {
      type: "line",
      x0: THIRD_LENGTH,
      x1: THIRD_LENGTH,
      y0: -PITCH_WIDTH / 2,
      y1: PITCH_WIDTH / 2,
      line: { color: cssBlack, width: 1, dash: "dot" },
    },
    {
      type: "line",
      x0: THIRD_LENGTH * 2,
      x1: THIRD_LENGTH * 2,
      y0: -PITCH_WIDTH / 2,
      y1: PITCH_WIDTH / 2,
      line: { color: cssBlack, width: 1, dash: "dot" },
    },
  ];
}

export function buildPitchAnnotations(cssBlack) {
  return [
    {
      x: THIRD_LENGTH / 2,
      y: PITCH_WIDTH / 2 + 2.5,
      text: "Left third",
      showarrow: false,
      font: { color: cssBlack, size: 12 },
      xanchor: "center",
      yanchor: "bottom",
    },
    {
      x: PITCH_LENGTH / 2,
      y: PITCH_WIDTH / 2 + 2.5,
      text: "Middle third",
      showarrow: false,
      font: { color: cssBlack, size: 12 },
      xanchor: "center",
      yanchor: "bottom",
    },
    {
      x: THIRD_LENGTH * 2.5,
      y: PITCH_WIDTH / 2 + 2.5,
      text: "Right third",
      showarrow: false,
      font: { color: cssBlack, size: 12 },
      xanchor: "center",
      yanchor: "bottom",
    },
    {
      x: THIRD_LENGTH,
      y: PITCH_WIDTH / 2 + 2.5,
      text: `${THIRD_LENGTH.toFixed(0)} m`,
      showarrow: false,
      font: { color: cssBlack, size: 11 },
      xanchor: "center",
      yanchor: "bottom",
    },
    {
      x: THIRD_LENGTH * 2,
      y: PITCH_WIDTH / 2 + 2.5,
      text: `${(THIRD_LENGTH * 2).toFixed(0)} m`,
      showarrow: false,
      font: { color: cssBlack, size: 11 },
      xanchor: "center",
      yanchor: "bottom",
    },
  ];
}
