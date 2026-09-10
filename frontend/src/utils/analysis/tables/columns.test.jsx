import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { getAnalysisProfileConfig } from "../../analysis/constants";

import {
  buildFilteredSampleStatsColumns,
  buildEntireEventStatTableColumns,
  buildEarlyLateEventStatTableColumns,
} from "./columns";

const ACC_DEC_ANALYSIS_PROFILE_CONFIG = getAnalysisProfileConfig("accDecSpeedAnalysisProfile");
const FORCE_VELOCITY_ANALYSIS_PROFILE_CONFIG = getAnalysisProfileConfig(
  "forceVelocityAnalysisProfile",
);

const identityFormatEventBinLabel = (binLabel) => binLabel;
const getEventBodyMassConstant80 = () => 80;

function findColumnByKey(columns, columnKey) {
  return columns.find((column) => column.columnKey === columnKey);
}

function renderCellText(cellElement) {
  if (cellElement == null || typeof cellElement !== "object") return String(cellElement);
  return render(cellElement).container.textContent;
}

function renderHeaderText(column) {
  const headerElement = column.renderHeader();
  if (typeof headerElement === "string") return headerElement;
  return render(headerElement).container.textContent;
}

describe("buildFilteredSampleStatsColumns", () => {
  const filteredSampleStatsColumns = buildFilteredSampleStatsColumns({
    analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
  });
  const filteredSampleStatsColumnsForceVelocity = buildFilteredSampleStatsColumns({
    analysisProfileConfig: FORCE_VELOCITY_ANALYSIS_PROFILE_CONFIG,
  });

  it("metric column renders 'fileName metricLabel'", () => {
    const metricColumn = findColumnByKey(filteredSampleStatsColumns, "metric");
    expect(metricColumn.renderHeader()).toBe("");
    expect(metricColumn.renderCell({ fileName: "run.csv", metricLabel: "Speed" })).toBe(
      "run.csv Speed",
    );
  });

  it.each([
    ["min", "Min"],
    ["mean", "Mean"],
    ["median", "Median"],
    ["max", "Max"],
  ])("aggregate stat column %s has header %s", (columnKey, expectedHeader) => {
    expect(findColumnByKey(filteredSampleStatsColumns, columnKey).renderHeader()).toBe(
      expectedHeader,
    );
  });

  it("aggregate stat column renders '-' for null stat value", () => {
    const meanColumn = findColumnByKey(filteredSampleStatsColumns, "mean");
    expect(
      meanColumn.renderCell({
        tableMetricKey: "acc",
        stats: { mean: null },
        units: { value: "m/s²" },
      }),
    ).toBe("-");
    const meanSpeedCell = meanColumn.renderCell({
      tableMetricKey: "speed",
      stats: { mean: null },
      units: { value: "m/s" },
    });
    expect(meanSpeedCell).toBe("-");
  });

  it("duration column formats seconds as HH:MM:SS.s with 'Duration' header tooltip", () => {
    const durationColumn = findColumnByKey(filteredSampleStatsColumns, "duration");
    expect(durationColumn.renderCell({ duration: 3661.5 })).toBe("01:01:01.5");
    const headerText = renderHeaderText(durationColumn);
    expect(headerText).toContain("Duration");
    expect(headerText).toContain("HH:MM:SS.s");
  });

  it("area column renders km for speed metric", () => {
    const areaColumn = findColumnByKey(filteredSampleStatsColumns, "area");
    expect(
      areaColumn.renderCell({ tableMetricKey: "speed", stats: { area: 5000 }, units: {} }),
    ).toBe("5.00 km");
  });

  it("area column renders value+unit for non-speed metric with area unit", () => {
    const areaColumn = findColumnByKey(filteredSampleStatsColumns, "area");
    expect(
      areaColumn.renderCell({
        tableMetricKey: "acc",
        stats: { area: 3 },
        units: { area: "m/s" },
      }),
    ).toBe("3.00 m/s");
  });

  it("area column renders '-' when non-speed metric has no area unit", () => {
    const areaColumn = findColumnByKey(filteredSampleStatsColumns, "area");
    expect(
      areaColumn.renderCell({
        tableMetricKey: "acc",
        stats: { area: 5 },
        units: { area: null },
      }),
    ).toBe("-");
  });

  it("area column renders '-' when speed area is null", () => {
    const areaColumn = findColumnByKey(filteredSampleStatsColumns, "area");
    expect(
      areaColumn.renderCell({ tableMetricKey: "speed", stats: { area: null }, units: {} }),
    ).toBe("-");
  });

  it("area column header varies wording per analysis profile", () => {
    const areaColumnAccDec = findColumnByKey(filteredSampleStatsColumns, "area");
    const areaColumnForceVelocity = findColumnByKey(
      filteredSampleStatsColumnsForceVelocity,
      "area",
    );
    expect(renderHeaderText(areaColumnAccDec)).toContain("Acceleration area = accumulated speed");
    expect(renderHeaderText(areaColumnForceVelocity)).toContain("Force area = accumulated impulse");
  });
});

const buildEntireEventStatRow = (overrides = {}) => ({
  fileName: "a.csv",
  binLabel: "Low",
  stats: {
    count: 3,
    density_per_min: 1.5,
    ratio_to_opposite: 2,
    mean_duration: 0.5,
    mean_distance: 12,
    mean_entry_speed: 2,
    mean_exit_speed: 4,
    mean_magnitude: 3,
    mean_relative_power_w_per_kg: 20,
    mean_horizontal_impulse: -50,
  },
  ...overrides,
});

describe("buildEntireEventStatTableColumns", () => {
  const entireEventStatTableColumnsAcc = buildEntireEventStatTableColumns({
    accDecDirection: "acc",
    analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
    horizontalPowerLabel: "horizontal power",
    impulseLabel: "HPI",
    getEventBodyMass: getEventBodyMassConstant80,
    formatEventBinLabel: identityFormatEventBinLabel,
    ratioLabel: "APR",
  });
  const entireEventStatTableColumnsDec = buildEntireEventStatTableColumns({
    accDecDirection: "dec",
    analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
    horizontalPowerLabel: "horizontal power",
    impulseLabel: "HBI",
    getEventBodyMass: getEventBodyMassConstant80,
    formatEventBinLabel: identityFormatEventBinLabel,
    ratioLabel: "DPR",
  });
  const entireEventStatTableColumnsForceVelocityAcc = buildEntireEventStatTableColumns({
    accDecDirection: "acc",
    analysisProfileConfig: FORCE_VELOCITY_ANALYSIS_PROFILE_CONFIG,
    horizontalPowerLabel: "horizontal power",
    impulseLabel: "HPI",
    getEventBodyMass: getEventBodyMassConstant80,
    formatEventBinLabel: identityFormatEventBinLabel,
    ratioLabel: "APR",
  });
  const entireEventStatTableColumnsForceVelocityDec = buildEntireEventStatTableColumns({
    accDecDirection: "dec",
    analysisProfileConfig: FORCE_VELOCITY_ANALYSIS_PROFILE_CONFIG,
    horizontalPowerLabel: "horizontal power",
    impulseLabel: "HBI",
    getEventBodyMass: getEventBodyMassConstant80,
    formatEventBinLabel: identityFormatEventBinLabel,
    ratioLabel: "DPR",
  });

  it("returns 12 columns in expected order", () => {
    expect(entireEventStatTableColumnsAcc.map((column) => column.columnKey)).toEqual([
      "fileName",
      "bin",
      "count",
      "density",
      "ratio",
      "duration",
      "distance",
      "entrySpeed",
      "exitSpeed",
      "magnitude",
      "horizontalPower",
      "impulse",
    ]);
  });

  it("fileName column renders fileName verbatim with 'File name' header", () => {
    const fileNameColumn = findColumnByKey(entireEventStatTableColumnsAcc, "fileName");
    expect(fileNameColumn.renderHeader()).toBe("File name");
    expect(fileNameColumn.renderCell(buildEntireEventStatRow())).toBe("a.csv");
    expect(fileNameColumn.cellClassName).toBe("columnLabel");
  });

  it("bin column uses formatEventBinLabel and analysisProfile metric unit in header", () => {
    const columnsWithPrefixedBin = buildEntireEventStatTableColumns({
      accDecDirection: "acc",
      analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
      horizontalPowerLabel: "horizontal power",
      impulseLabel: "HPI",
      getEventBodyMass: getEventBodyMassConstant80,
      formatEventBinLabel: (binLabel) => `BIN-${binLabel}`,
      ratioLabel: "APR",
    });
    const binColumn = findColumnByKey(columnsWithPrefixedBin, "bin");
    expect(binColumn.renderCell({ binLabel: "Low" })).toBe("BIN-Low");
    expect(binColumn.renderHeader()).toBe("Bin (m/s²)");
    expect(findColumnByKey(entireEventStatTableColumnsForceVelocityAcc, "bin").renderHeader()).toBe(
      "Bin (N)",
    );
  });

  it.each([
    [3.7, "4"],
    [0, "0"],
  ])("count column rounds numeric %s to '%s'", (countValue, expectedRoundedCount) => {
    const countColumn = findColumnByKey(entireEventStatTableColumnsAcc, "count");
    expect(countColumn.renderCell(buildEntireEventStatRow({ stats: { count: countValue } }))).toBe(
      expectedRoundedCount,
    );
  });

  it("count column renders '-' when count is null", () => {
    const countColumn = findColumnByKey(entireEventStatTableColumnsAcc, "count");
    expect(countColumn.renderCell(buildEntireEventStatRow({ stats: { count: null } }))).toBe("-");
    expect(countColumn.renderHeader()).toBe("Count");
  });

  it("density column suffixes /min and header is 'Density'", () => {
    const densityColumn = findColumnByKey(entireEventStatTableColumnsAcc, "density");
    expect(densityColumn.renderCell(buildEntireEventStatRow())).toBe("1.50/min");
    expect(densityColumn.renderHeader()).toBe("Density");
  });

  it("ratio column formats value with tooltip depending on accDecDirection", () => {
    const ratioColumnAcc = findColumnByKey(entireEventStatTableColumnsAcc, "ratio");
    const ratioColumnDec = findColumnByKey(entireEventStatTableColumnsDec, "ratio");
    expect(ratioColumnAcc.renderCell({ stats: { ratio_to_opposite: 2.5 } })).toBe("2.50");
    expect(renderHeaderText(ratioColumnAcc)).toContain("acceleration count / deceleration count");
    expect(renderHeaderText(ratioColumnDec)).toContain("deceleration count / acceleration count");
  });

  it("duration column formats seconds", () => {
    const durationColumn = findColumnByKey(entireEventStatTableColumnsAcc, "duration");
    expect(durationColumn.renderCell(buildEntireEventStatRow())).toBe("0.50 s");
    expect(durationColumn.renderHeader()).toBe("Mean duration");
  });

  it("distance column formats meters", () => {
    const distanceColumn = findColumnByKey(entireEventStatTableColumnsAcc, "distance");
    expect(distanceColumn.renderCell(buildEntireEventStatRow())).toBe("12.00 m");
    expect(distanceColumn.renderHeader()).toBe("Mean distance");
  });

  it.each([
    ["entrySpeed", "mean_entry_speed", 5],
    ["exitSpeed", "mean_exit_speed", 3],
  ])(
    "%s column renders speed pair with m/s and km/h",
    (columnKey, meanSpeedStatKey, meanSpeedValue) => {
      const speedColumn = findColumnByKey(entireEventStatTableColumnsAcc, columnKey);
      const renderedText = renderCellText(
        speedColumn.renderCell({ stats: { [meanSpeedStatKey]: meanSpeedValue } }),
      );
      expect(renderedText).toContain(`${meanSpeedValue.toFixed(2)} m/s`);
      expect(renderedText).toContain("km/h");
    },
  );

  it("magnitude column uses m/s² for acc-dec profile", () => {
    const magnitudeColumn = findColumnByKey(entireEventStatTableColumnsAcc, "magnitude");
    expect(magnitudeColumn.renderCell(buildEntireEventStatRow())).toBe("3.00 m/s²");
    expect(magnitudeColumn.renderHeader()).toBe("Mean acceleration");
    expect(findColumnByKey(entireEventStatTableColumnsDec, "magnitude").renderHeader()).toBe(
      "Mean deceleration",
    );
  });

  it("magnitude column scales by mass and uses N under force-velocity profile", () => {
    const magnitudeColumn = findColumnByKey(
      entireEventStatTableColumnsForceVelocityAcc,
      "magnitude",
    );
    expect(magnitudeColumn.renderCell(buildEntireEventStatRow())).toBe("240.00 N");
    expect(magnitudeColumn.renderHeader()).toBe("Mean acceleration force");
  });

  it("horizontalPower column uses W/kg by default and W under force-velocity", () => {
    expect(
      findColumnByKey(entireEventStatTableColumnsAcc, "horizontalPower").renderCell(
        buildEntireEventStatRow(),
      ),
    ).toBe("20.00 W/kg");
    expect(
      findColumnByKey(entireEventStatTableColumnsForceVelocityAcc, "horizontalPower").renderCell(
        buildEntireEventStatRow(),
      ),
    ).toBe("1600.00 W");
  });

  it.each([
    ["acc-dec / acc", entireEventStatTableColumnsAcc, "acc", "Relative propulsive power"],
    ["acc-dec / dec", entireEventStatTableColumnsDec, "dec", "Relative braking power"],
    [
      "force-velocity / acc",
      entireEventStatTableColumnsForceVelocityAcc,
      "acc",
      "Propulsive power",
    ],
    ["force-velocity / dec", entireEventStatTableColumnsForceVelocityDec, "dec", "Braking power"],
  ])(
    "horizontalPower header (%s) tooltip includes '%s' wording",
    (_case, columns, _direction, expectedWording) => {
      const horizontalPowerColumn = findColumnByKey(columns, "horizontalPower");
      expect(renderHeaderText(horizontalPowerColumn)).toContain(expectedWording);
    },
  );

  it("impulse column uses absolute value in N·s", () => {
    const impulseColumn = findColumnByKey(entireEventStatTableColumnsAcc, "impulse");
    expect(impulseColumn.renderCell(buildEntireEventStatRow())).toBe("50.00 N·s");
  });

  it("impulse column renders '-' when impulse is null", () => {
    const impulseColumn = findColumnByKey(entireEventStatTableColumnsAcc, "impulse");
    expect(
      impulseColumn.renderCell(
        buildEntireEventStatRow({ stats: { mean_horizontal_impulse: null } }),
      ),
    ).toBe("-");
  });

  it("impulse column header text and tooltip vary by direction", () => {
    const impulseHeaderTextAcc = renderHeaderText(
      findColumnByKey(entireEventStatTableColumnsAcc, "impulse"),
    );
    const impulseHeaderTextDec = renderHeaderText(
      findColumnByKey(entireEventStatTableColumnsDec, "impulse"),
    );
    expect(impulseHeaderTextAcc).toContain("Mean HPI");
    expect(impulseHeaderTextAcc).toContain("Horizontal Propulsive Impulse");
    expect(impulseHeaderTextDec).toContain("Mean HBI");
    expect(impulseHeaderTextDec).toContain("Horizontal Braking Impulse");
  });

  it("ratio, duration, distance render '-' when nullish", () => {
    const ratioColumn = findColumnByKey(entireEventStatTableColumnsAcc, "ratio");
    const durationColumn = findColumnByKey(entireEventStatTableColumnsAcc, "duration");
    const distanceColumn = findColumnByKey(entireEventStatTableColumnsAcc, "distance");
    expect(ratioColumn.renderCell({ stats: { ratio_to_opposite: null } })).toBe("-");
    expect(durationColumn.renderCell({ stats: { mean_duration: null } })).toBe("-");
    expect(distanceColumn.renderCell({ stats: { mean_distance: null } })).toBe("-");
  });

  it("density renders '-/min' when density_per_min is null", () => {
    const densityColumn = findColumnByKey(entireEventStatTableColumnsAcc, "density");
    expect(densityColumn.renderCell({ stats: { density_per_min: null } })).toBe("-/min");
  });
});

const buildEarlyLateEventStatRow = (overrides = {}) => ({
  fileName: "a.csv",
  binLabel: "Low",
  stats: {
    mean_early_duration: 0.5,
    mean_late_duration: 0.25,
    mean_early_distance: 10,
    mean_late_distance: 5,
    mean_early_mean_magnitude: 3,
    mean_late_mean_magnitude: 1,
    mean_early_peak_magnitude: 5,
    mean_late_peak_magnitude: 2,
    mean_early_mean_relative_power_w_per_kg: 20,
    mean_late_mean_relative_power_w_per_kg: 10,
    mean_early_peak_relative_power_w_per_kg: 30,
    mean_late_peak_relative_power_w_per_kg: 15,
    mean_early_impulse: -60,
    mean_late_impulse: 30,
  },
  ...overrides,
});

describe("buildEarlyLateEventStatTableColumns", () => {
  const earlyLateColumnsAccDecAcc = buildEarlyLateEventStatTableColumns({
    analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
    getEventBodyMass: getEventBodyMassConstant80,
    accDecDirection: "acc",
    formatEventBinLabel: identityFormatEventBinLabel,
  });
  const earlyLateColumnsAccDecDec = buildEarlyLateEventStatTableColumns({
    analysisProfileConfig: ACC_DEC_ANALYSIS_PROFILE_CONFIG,
    getEventBodyMass: getEventBodyMassConstant80,
    accDecDirection: "dec",
    formatEventBinLabel: identityFormatEventBinLabel,
  });
  const earlyLateColumnsForceVelocityAcc = buildEarlyLateEventStatTableColumns({
    analysisProfileConfig: FORCE_VELOCITY_ANALYSIS_PROFILE_CONFIG,
    getEventBodyMass: getEventBodyMassConstant80,
    accDecDirection: "acc",
    formatEventBinLabel: identityFormatEventBinLabel,
  });
  const earlyLateColumnsForceVelocityDec = buildEarlyLateEventStatTableColumns({
    analysisProfileConfig: FORCE_VELOCITY_ANALYSIS_PROFILE_CONFIG,
    getEventBodyMass: getEventBodyMassConstant80,
    accDecDirection: "dec",
    formatEventBinLabel: identityFormatEventBinLabel,
  });

  it("returns 9 columns in expected order", () => {
    expect(earlyLateColumnsAccDecAcc.map((column) => column.columnKey)).toEqual([
      "fileName",
      "bin",
      "duration",
      "distance",
      "meanMagnitude",
      "peakMagnitude",
      "meanHorizontalPower",
      "peakHorizontalPower",
      "impulse",
    ]);
  });

  it("fileName column renders fileName verbatim", () => {
    const fileNameColumn = findColumnByKey(earlyLateColumnsAccDecAcc, "fileName");
    expect(fileNameColumn.renderHeader()).toBe("File name");
    expect(fileNameColumn.renderCell({ fileName: "run.csv" })).toBe("run.csv");
    expect(fileNameColumn.cellClassName).toBe("columnLabel");
  });

  it("distance column header renders 'Mean distance'", () => {
    const distanceColumn = findColumnByKey(earlyLateColumnsAccDecAcc, "distance");
    expect(distanceColumn.renderHeader()).toBe("Mean distance");
  });

  it("bin header uses metric unit and cell renders early/late/ratio composite", () => {
    const binColumn = findColumnByKey(earlyLateColumnsAccDecAcc, "bin");
    expect(binColumn.renderHeader()).toBe("Bin (m/s²)");
    expect(findColumnByKey(earlyLateColumnsForceVelocityAcc, "bin").renderHeader()).toBe("Bin (N)");
    const renderedText = renderCellText(binColumn.renderCell({ binLabel: "Low" }));
    expect(renderedText).toContain("Low early");
    expect(renderedText).toContain("Low late");
    expect(renderedText).toContain("Low early/late");
  });

  it("duration column renders early/late/ratio values", () => {
    const durationColumn = findColumnByKey(earlyLateColumnsAccDecAcc, "duration");
    expect(durationColumn.renderHeader()).toBe("Mean duration");
    const renderedText = renderCellText(durationColumn.renderCell(buildEarlyLateEventStatRow()));
    expect(renderedText).toContain("0.50 s");
    expect(renderedText).toContain("0.25 s");
    expect(renderedText).toContain("2.00");
  });

  it("ratio is '-' when late is zero", () => {
    const durationColumn = findColumnByKey(earlyLateColumnsAccDecAcc, "duration");
    const renderedText = renderCellText(
      durationColumn.renderCell({
        stats: { mean_early_duration: 5, mean_late_duration: 0 },
      }),
    );
    expect(renderedText).toContain("-");
  });

  it("distance column renders meters and ratio", () => {
    const distanceColumn = findColumnByKey(earlyLateColumnsAccDecAcc, "distance");
    const renderedText = renderCellText(distanceColumn.renderCell(buildEarlyLateEventStatRow()));
    expect(renderedText).toContain("10.00 m");
    expect(renderedText).toContain("5.00 m");
    expect(renderedText).toContain("2.00");
  });

  it.each([
    ["meanMagnitude", "3.00 m/s²", "240.00 N", "average"],
    ["peakMagnitude", "5.00 m/s²", "400.00 N", "peak"],
  ])(
    "%s uses m/s² default and N under force-velocity",
    (columnKey, expectedAccDecFirstText, expectedForceVelocityFirstText, expectedHeaderWord) => {
      const magnitudeColumnAccDec = findColumnByKey(earlyLateColumnsAccDecAcc, columnKey);
      const magnitudeColumnForceVelocity = findColumnByKey(
        earlyLateColumnsForceVelocityAcc,
        columnKey,
      );
      expect(
        renderCellText(magnitudeColumnAccDec.renderCell(buildEarlyLateEventStatRow())),
      ).toContain(expectedAccDecFirstText);
      expect(
        renderCellText(magnitudeColumnForceVelocity.renderCell(buildEarlyLateEventStatRow())),
      ).toContain(expectedForceVelocityFirstText);
      expect(magnitudeColumnAccDec.renderHeader()).toContain(expectedHeaderWord);
      expect(magnitudeColumnAccDec.renderHeader()).toContain("acceleration");
    },
  );

  it.each([
    ["meanHorizontalPower", "20.00 W/kg", "1600.00 W"],
    ["peakHorizontalPower", "30.00 W/kg", "2400.00 W"],
  ])(
    "%s uses W/kg default and W under force-velocity",
    (columnKey, expectedAccDecFirstText, expectedForceVelocityFirstText) => {
      const powerColumnAccDec = findColumnByKey(earlyLateColumnsAccDecAcc, columnKey);
      const powerColumnForceVelocity = findColumnByKey(earlyLateColumnsForceVelocityAcc, columnKey);
      expect(renderCellText(powerColumnAccDec.renderCell(buildEarlyLateEventStatRow()))).toContain(
        expectedAccDecFirstText,
      );
      expect(
        renderCellText(powerColumnForceVelocity.renderCell(buildEarlyLateEventStatRow())),
      ).toContain(expectedForceVelocityFirstText);
    },
  );

  it("impulse column renders absolute values with N·s and header per direction", () => {
    const impulseColumnAcc = findColumnByKey(earlyLateColumnsAccDecAcc, "impulse");
    const impulseColumnDec = findColumnByKey(earlyLateColumnsAccDecDec, "impulse");
    const renderedTextAcc = renderCellText(
      impulseColumnAcc.renderCell(buildEarlyLateEventStatRow()),
    );
    expect(renderedTextAcc).toContain("60.00 N·s");
    expect(renderedTextAcc).toContain("30.00 N·s");
    expect(renderedTextAcc).toContain("2.00");
    expect(renderHeaderText(impulseColumnAcc)).toContain("HPI");
    expect(renderHeaderText(impulseColumnAcc)).toContain("Horizontal Propulsive Impulse");
    expect(renderHeaderText(impulseColumnDec)).toContain("HBI");
    expect(renderHeaderText(impulseColumnDec)).toContain("Horizontal Braking Impulse");
  });

  it.each([
    [
      "acc-dec / acc",
      "meanHorizontalPower",
      () => earlyLateColumnsAccDecAcc,
      "Relative propulsive power average",
    ],
    [
      "acc-dec / dec",
      "meanHorizontalPower",
      () => earlyLateColumnsAccDecDec,
      "Relative braking power average",
    ],
    [
      "force-velocity / acc",
      "meanHorizontalPower",
      () => earlyLateColumnsForceVelocityAcc,
      "Propulsive power average",
    ],
    [
      "force-velocity / dec",
      "meanHorizontalPower",
      () => earlyLateColumnsForceVelocityDec,
      "Braking power average",
    ],
    [
      "acc-dec / acc",
      "peakHorizontalPower",
      () => earlyLateColumnsAccDecAcc,
      "Relative propulsive power peak",
    ],
    [
      "acc-dec / dec",
      "peakHorizontalPower",
      () => earlyLateColumnsAccDecDec,
      "Relative braking power peak",
    ],
    [
      "force-velocity / acc",
      "peakHorizontalPower",
      () => earlyLateColumnsForceVelocityAcc,
      "Propulsive power peak",
    ],
    [
      "force-velocity / dec",
      "peakHorizontalPower",
      () => earlyLateColumnsForceVelocityDec,
      "Braking power peak",
    ],
  ])(
    "horizontal power header (%s / %s) tooltip includes '%s'",
    (_case, columnKey, getColumns, expectedWording) => {
      const powerColumn = findColumnByKey(getColumns(), columnKey);
      expect(renderHeaderText(powerColumn)).toContain(expectedWording);
    },
  );

  it("meanHorizontalPower header shows PP for acc and BP for dec", () => {
    const meanPowerColumnAcc = findColumnByKey(earlyLateColumnsAccDecAcc, "meanHorizontalPower");
    const meanPowerColumnDec = findColumnByKey(earlyLateColumnsAccDecDec, "meanHorizontalPower");
    expect(renderHeaderText(meanPowerColumnAcc)).toContain("PP average");
    expect(renderHeaderText(meanPowerColumnDec)).toContain("BP average");
  });

  it("renders '-' for early/late values when magnitude fields are nullish", () => {
    const meanMagnitudeColumn = findColumnByKey(earlyLateColumnsForceVelocityAcc, "meanMagnitude");
    const renderedText = renderCellText(
      meanMagnitudeColumn.renderCell({
        fileName: "a.csv",
        stats: { mean_early_mean_magnitude: null, mean_late_mean_magnitude: undefined },
      }),
    );
    expect(renderedText).toContain("-");
  });

  it("early-late duration renders '-' for null values (no transformStatValue branch)", () => {
    const durationColumn = findColumnByKey(earlyLateColumnsAccDecAcc, "duration");
    const renderedText = renderCellText(
      durationColumn.renderCell({
        stats: { mean_early_duration: null, mean_late_duration: null },
      }),
    );
    expect(renderedText).toContain("-");
  });
});
