import PitchTrajectoryChart from "../../../components/analysis/PitchTrajectoryChart/PitchTrajectoryChart";
import TimeSeriesChart from "../../../components/analysis/TimeSeriesChart/TimeSeriesChart";
import { SelectField } from "../../../ui/form/fields/ParamFields";

import styles from "./TimeSeriesAndTrajectorySection.module.css";

const SPEED_UNIT_OPTIONS = [
  { value: "m/s", label: "m/s" },
  { value: "km/h", label: "km/h" },
];

const TIME_MODE_OPTIONS = [
  { value: "relative", label: "Relative" },
  { value: "absolute", label: "Absolute" },
];

export default function TimeSeriesAndTrajectorySection({
  analysisViewOptions,
  analysisViewModel,
  analysisProfileConfig,
  formatAnalysisTimeLabel,
  chosenAnalysisPointsTableState,
  colorMap,
}) {
  const timeSeriesChartConfigs = [
    {
      timeSeriesChartKey: "speed",
      timeSeriesChartTitle: "Speed",
      timeSeriesChartYAxisTitle: `Speed (${analysisViewOptions.timeSeriesSpeedUnit})`,
      metricTimeSeriesList: analysisViewModel.combinedTimeSeries.speedChartSeries,
      timeSeriesChartValueLabelFormatter: () => "Speed",
      timeSeriesChartSpeedReferenceLines: analysisViewModel.speedReferenceLines,
    },
    {
      timeSeriesChartKey: "acc",
      timeSeriesChartTitle: analysisProfileConfig.metricLabel,
      timeSeriesChartYAxisTitle: `${analysisProfileConfig.metricLabel} (${analysisProfileConfig.metricUnit})`,
      metricTimeSeriesList: analysisViewModel.combinedTimeSeries.accChartSeries,
      timeSeriesChartValueLabelFormatter: (metricValue) => {
        if (analysisProfileConfig.isForce) return analysisProfileConfig.metricLabel;
        return metricValue < 0 ? "Deceleration" : "Acceleration";
      },
    },
  ];
  return (
    <>
      <div className={styles.analysisViewOptionsToolbar}>
        <div className={styles.analysisViewOptionsToolbarFieldsRow}>
          <SelectField
            fieldLabel="Speed unit"
            fieldOptions={SPEED_UNIT_OPTIONS}
            fieldValue={analysisViewOptions.timeSeriesSpeedUnit}
            isDisabled={false}
            onFieldChange={analysisViewOptions.setTimeSeriesSpeedUnit}
          />
          <SelectField
            fieldLabel="Time mode"
            fieldOptions={TIME_MODE_OPTIONS}
            fieldValue={analysisViewOptions.timeMode}
            isDisabled={false}
            onFieldChange={analysisViewOptions.setTimeMode}
          />
        </div>
      </div>

      {timeSeriesChartConfigs.map(({ timeSeriesChartKey, ...timeSeriesChartConfigProps }) => (
        <TimeSeriesChart
          key={timeSeriesChartKey}
          {...timeSeriesChartConfigProps}
          chosenAnalysisPointsState={chosenAnalysisPointsTableState.chosenAnalysisPointsListState}
          formatTimeSeriesChartXHoverLabel={formatAnalysisTimeLabel}
          formatTimeSeriesChartXTickLabel={formatAnalysisTimeLabel}
          timeSeriesChartXAxisIncludesZero={!analysisViewModel.canUseAbsoluteTimeAxis}
          timeSeriesChartXAxisTitle={
            analysisViewModel.canUseAbsoluteTimeAxis ? "Absolute time" : "Relative time"
          }
        />
      ))}

      <PitchTrajectoryChart
        analysisProfileConfig={analysisProfileConfig}
        chosenAnalysisPointsState={chosenAnalysisPointsTableState.chosenAnalysisPointsListState}
        colorMap={colorMap}
        formatAnalysisTimeLabel={formatAnalysisTimeLabel}
        visibleAnalysisResults={analysisViewModel.visibleAnalysisResults}
      />
    </>
  );
}
