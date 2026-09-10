import { describe, it, expect } from "vitest";

import { PITCH_ZONE_OPTIONS, ACTIVITY_SCOPE_OPTIONS } from "../../../analysis/constants";

import { buildRawEventsExport } from "./rawEventsExport";

function emptyZonesWithEvents(events = []) {
  const out = {};
  for (const { value: zone } of PITCH_ZONE_OPTIONS) {
    out[zone] = {};
    for (const { value: scope } of ACTIVITY_SCOPE_OPTIONS) {
      out[zone][scope] = { events: zone === "full" && scope === "all" ? events : [] };
    }
  }
  return out;
}

const eventFixture = {
  start_index: 0,
  end_index: 2,
  split_index: 1,
  duration: 0.5,
  entry_speed: 1.0,
  exit_speed: 3.0,
  peak_magnitude: 4.0,
  mean_magnitude: 2.0,
  mean_relative_power_w_per_kg: 10,
  horizontal_impulse: -0.5,
  distance: 0.4,
  impulse: 0.8,
  early_duration: 0.2,
  late_duration: 0.3,
  early_distance: 0.1,
  late_distance: 0.3,
  early_mean_magnitude: 1.5,
  late_mean_magnitude: 2.5,
  early_peak_magnitude: 2.0,
  late_peak_magnitude: 3.0,
  early_mean_relative_power_w_per_kg: 8,
  late_mean_relative_power_w_per_kg: 12,
  early_peak_relative_power_w_per_kg: 9,
  late_peak_relative_power_w_per_kg: 14,
  early_impulse: 0.3,
  late_impulse: 0.5,
};

function makeItem(fileName, events = []) {
  return {
    file_name: fileName,
    analysis: {
      meta: { body_mass_kg: 80 },
      time_series: {
        start_time: "00:00:00.0",
        relative_times: [0, 0.5, 1.0],
      },
      acc_events: emptyZonesWithEvents(events),
      dec_events: emptyZonesWithEvents(),
    },
  };
}

describe("buildRawEventsExport", () => {
  it("emits fixed 54-column header", () => {
    const { headers } = buildRawEventsExport([], "acc");
    expect(headers).toHaveLength(54);
    expect(headers[0]).toBe("file_name");
    expect(headers.at(-1)).toBe("late_impulse_n_s");
  });

  it("emits no rows for zero events", () => {
    const { rows } = buildRawEventsExport([makeItem("a.csv")], "acc");
    expect(rows).toHaveLength(0);
  });

  it("emits one row per event per zone × scope where events present", () => {
    const { rows } = buildRawEventsExport([makeItem("a.csv", [eventFixture])], "acc");
    expect(rows).toHaveLength(1);
  });

  it("applies bodyMass to force conversions", () => {
    const { headers, rows } = buildRawEventsExport([makeItem("a.csv", [eventFixture])], "acc");
    const row = rows[0];
    const index = (name) => headers.indexOf(name);
    expect(row[index("peak_magnitude_force_n")]).toBe(320);
    expect(row[index("mean_force_n")]).toBe(160);
    expect(row[index("mean_power_w")]).toBe(800);
  });

  it("computes absolute impulses", () => {
    const { headers, rows } = buildRawEventsExport([makeItem("a.csv", [eventFixture])], "acc");
    const row = rows[0];
    const index = (name) => headers.indexOf(name);
    expect(row[index("horizontal_impulse_m_per_s")]).toBe(0.5);
    expect(row[index("horizontal_impulse_n_s")]).toBe(40);
  });

  it("formats raw event bins from peak magnitude", () => {
    const { headers, rows } = buildRawEventsExport([makeItem("a.csv", [eventFixture])], "acc");
    const row = rows[0];
    const index = (name) => headers.indexOf(name);
    expect(row[index("classic_bin_acc")]).toBe(">=3.5");
    expect(row[index("classic_bin_force")]).toBe(">=262.5");
    expect(row[index("detailed_bin_acc")]).toBe("4-5");
    expect(row[index("detailed_bin_force")]).toBe("300-375");
  });

  it("classifies low-peak events into the lowest zero-anchored bin", () => {
    const lowPeakEvent = { ...eventFixture, peak_magnitude: 2.0 };
    const { headers, rows } = buildRawEventsExport([makeItem("a.csv", [lowPeakEvent])], "acc");
    const row = rows[0];
    const index = (name) => headers.indexOf(name);
    expect(row[index("classic_bin_acc")]).toBe("0-2.5");
    expect(row[index("classic_bin_force")]).toBe("0-187.5");
    expect(row[index("detailed_bin_acc")]).toBe("0-3");
    expect(row[index("detailed_bin_force")]).toBe("0-225");
  });

  it("row width matches header width", () => {
    const { headers, rows } = buildRawEventsExport([makeItem("a.csv", [eventFixture])], "acc");
    expect(rows[0]).toHaveLength(headers.length);
  });

  it("includes absolute times from time_series", () => {
    const { headers, rows } = buildRawEventsExport([makeItem("a.csv", [eventFixture])], "acc");
    const index = (name) => headers.indexOf(name);
    expect(rows[0][index("start_absolute_time")]).toBe("00:00:00.0");
    expect(rows[0][index("end_absolute_time")]).toBe("00:00:01.0");
  });
});
