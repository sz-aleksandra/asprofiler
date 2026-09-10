import { ACC_DEC_DIRECTIONS, ACC_DEC_DIRECTION_CONFIGS } from "../constants";
import {
  runLengthEncodingToSampleLabels,
  formatToTwoDecimalPlaces,
  secondsToTime,
  relativeTimeSeriesToAbsoluteTimes,
  safeScaleByMass,
} from "../formatters";

import { buildCsvFile } from "./output";

const SAMPLE_POINT_CSV_HEADER = [
  "file_name",
  "analysis_profile_acc_dec_direction",
  "index",
  "label",
  "time",
  "absolute_time",
  "speed_m_per_s",
  "acc_m_per_s2",
  "force_n",
  "body_mass_kg",
];

const ACC_DEC_DIRECTION_ANALYSIS_PROFILE_FIT_CSV_HEADER = [
  "file_name",
  "analysis_profile_acc_dec_direction",
  "acc_dec_profile_equation",
  "a0_m_per_s2",
  "f0_n",
  "s0_m_per_s",
  "r_squared",
  "body_mass_kg",
];

function buildSamplePointExportRowsForAccDecDirection(analysisResults, accDecDirection) {
  return analysisResults.flatMap((analysisResult) => {
    const sampleLabels = runLengthEncodingToSampleLabels(
      analysisResult.analysis.time_series[`${accDecDirection}_labels`],
    );
    const absoluteTimes = relativeTimeSeriesToAbsoluteTimes(analysisResult.analysis.time_series);
    return analysisResult.analysis.time_series.speeds.map((speed, timeSeriesIndex) => [
      analysisResult.file_name,
      accDecDirection,
      timeSeriesIndex,
      sampleLabels[timeSeriesIndex],
      analysisResult.analysis.time_series.relative_times[timeSeriesIndex],
      secondsToTime(absoluteTimes[timeSeriesIndex]),
      speed,
      analysisResult.analysis.time_series.accs[timeSeriesIndex],
      safeScaleByMass(
        analysisResult.analysis.time_series.accs[timeSeriesIndex],
        analysisResult.analysis.meta.body_mass_kg,
      ),
      analysisResult.analysis.meta.body_mass_kg,
    ]);
  });
}

function buildAccDecDirectionAnalysisProfileFitExportRows(analysisResults) {
  return analysisResults.flatMap((analysisResult) =>
    ACC_DEC_DIRECTION_CONFIGS.flatMap((accDecDirectionConfig) => {
      const accDecDirectionAnalysisProfileFit =
        analysisResult.analysis[`${accDecDirectionConfig.accDecDirection}_profile_fit`];
      if (accDecDirectionAnalysisProfileFit == null) return [];
      const accDecDirectionAnalysisProfileIntercept =
        accDecDirectionAnalysisProfileFit.intercept *
        accDecDirectionConfig.accDecDirectionMultiplier;
      const accDecDirectionAnalysisProfileSlope =
        accDecDirectionAnalysisProfileFit.slope * accDecDirectionConfig.accDecDirectionMultiplier;
      return [
        [
          analysisResult.file_name,
          accDecDirectionConfig.accDecDirectionLabel,
          `a = ${formatToTwoDecimalPlaces(accDecDirectionAnalysisProfileIntercept)} + (${formatToTwoDecimalPlaces(accDecDirectionAnalysisProfileSlope)}) · v`,
          accDecDirectionAnalysisProfileIntercept,
          safeScaleByMass(
            accDecDirectionAnalysisProfileIntercept,
            analysisResult.analysis.meta.body_mass_kg,
          ),
          accDecDirectionAnalysisProfileFit.zero_crossing_speed,
          accDecDirectionAnalysisProfileFit.r_squared,
          analysisResult.analysis.meta.body_mass_kg,
        ],
      ];
    }),
  );
}

export function buildAnalysisProfileExportFiles(analysisResults) {
  const analysisProfileExportFiles = ACC_DEC_DIRECTIONS.map((accDecDirection) =>
    buildCsvFile(
      `${accDecDirection}_profile_points.csv`,
      SAMPLE_POINT_CSV_HEADER,
      buildSamplePointExportRowsForAccDecDirection(analysisResults, accDecDirection),
    ),
  );
  const accDecDirectionAnalysisProfileFitExportRows =
    buildAccDecDirectionAnalysisProfileFitExportRows(analysisResults);
  if (accDecDirectionAnalysisProfileFitExportRows.length > 0) {
    analysisProfileExportFiles.push(
      buildCsvFile(
        "acc_dec_profile_fit.csv",
        ACC_DEC_DIRECTION_ANALYSIS_PROFILE_FIT_CSV_HEADER,
        accDecDirectionAnalysisProfileFitExportRows,
      ),
    );
  }
  return analysisProfileExportFiles;
}
