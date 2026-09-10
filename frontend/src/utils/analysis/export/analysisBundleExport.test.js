import { describe, it, expect, vi, beforeEach } from "vitest";

import { makeAnalysis, directionEvents } from "../../../../test/testUtils";

vi.mock("./output", async () => {
  const actualModule = await vi.importActual("./output");
  return { ...actualModule, downloadZip: vi.fn() };
});

import { exportAnalysis } from "./analysisBundleExport";
import { downloadZip } from "./output";

function makeAnalysisResult(fileName) {
  const eventOverride = (pitchZone, activityScope, kind) =>
    kind === "event" ? { peak_magnitude: 4.0 } : {};
  return {
    file_name: fileName,
    analysis: makeAnalysis({
      acc_events: directionEvents(eventOverride),
      dec_events: directionEvents(eventOverride),
      time_series: {
        start_time: "10:00:00.0",
        relative_times: [0, 0.5, 1.0],
        speeds: [1, 2, 3],
        accs: [0.5, 1.0, 1.5],
        acc_labels: [
          ["s", 1],
          ["i", 1],
          ["e", 1],
        ],
        dec_labels: [["e", 3]],
        x: [],
        y: [],
      },
    }),
  };
}

describe("exportAnalysis", () => {
  beforeEach(() => {
    downloadZip.mockClear();
  });

  it("invokes downloadZip exactly once with the fixed archive name", async () => {
    await exportAnalysis({
      analysisResults: [makeAnalysisResult("session.csv")],
      analysisParams: { alpha: 1 },
      csvFilterParams: {},
      preprocessingParams: {},
    });
    expect(downloadZip).toHaveBeenCalledTimes(1);
    expect(downloadZip.mock.calls[0][1]).toBe("analysis.zip");
  });

  it("bundles analysis params json, sample stats, profile files and per direction event files", async () => {
    await exportAnalysis({
      analysisResults: [makeAnalysisResult("session.csv")],
      analysisParams: {},
      csvFilterParams: {},
      preprocessingParams: {},
    });
    const archiveEntryPaths = downloadZip.mock.calls[0][0]
      .map((archiveEntry) => archiveEntry.name)
      .sort();
    expect(archiveEntryPaths).toEqual([
      "analysisProfile/acc_dec_profile_fit.csv",
      "analysisProfile/acc_profile_points.csv",
      "analysisProfile/dec_profile_points.csv",
      "analysis_params.json",
      "events/acc/acc_event_early_late_stats.csv",
      "events/acc/acc_event_entire_stats.csv",
      "events/acc/acc_events.csv",
      "events/dec/dec_event_early_late_stats.csv",
      "events/dec/dec_event_entire_stats.csv",
      "events/dec/dec_events.csv",
      "stats/filtered_sample_stats.csv",
    ]);
  });

  it("encodes analysis params, per file meta, csv filter and preprocessing params into the params json entry", async () => {
    await exportAnalysis({
      analysisResults: [makeAnalysisResult("first.csv"), makeAnalysisResult("second.csv")],
      analysisParams: { alpha: 1 },
      csvFilterParams: { max_hacc: 2 },
      preprocessingParams: { filter_window_samples: 5, filter_mode: "avg" },
    });
    const analysisParamsEntry = downloadZip.mock.calls[0][0].find(
      (archiveEntry) => archiveEntry.name === "analysis_params.json",
    );
    const parsedAnalysisParams = JSON.parse(analysisParamsEntry.content);
    expect(parsedAnalysisParams.analysis_params).toEqual({ alpha: 1 });
    expect(parsedAnalysisParams.csv_filter_params).toEqual({ max_hacc: 2 });
    expect(parsedAnalysisParams.preprocessing_params).toEqual({
      filter_window_samples: 5,
      filter_mode: "avg",
    });
    expect(Object.keys(parsedAnalysisParams.per_file_params)).toEqual(["first.csv", "second.csv"]);
    expect(parsedAnalysisParams.per_file_params["first.csv"].body_mass_kg).toBe(75);
  });

  it.each(["acc", "dec"])("emits three event CSVs under events/%s", async (accDecDirection) => {
    await exportAnalysis({
      analysisResults: [makeAnalysisResult("session.csv")],
      analysisParams: {},
      csvFilterParams: {},
      preprocessingParams: {},
    });
    const directionEventEntryNames = downloadZip.mock.calls[0][0]
      .map((archiveEntry) => archiveEntry.name)
      .filter((name) => name.startsWith(`events/${accDecDirection}/`))
      .sort();
    expect(directionEventEntryNames).toEqual([
      `events/${accDecDirection}/${accDecDirection}_event_early_late_stats.csv`,
      `events/${accDecDirection}/${accDecDirection}_event_entire_stats.csv`,
      `events/${accDecDirection}/${accDecDirection}_events.csv`,
    ]);
  });
});
