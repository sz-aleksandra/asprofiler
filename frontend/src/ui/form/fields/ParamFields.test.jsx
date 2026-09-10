import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { NumericField, SpeedField, SelectField, ColorField } from "./ParamFields";

const identityParseInputValue = (rawInputValue) => rawInputValue;

describe("NumericField", () => {
  it("passes the raw input value through parseInputValue before calling onFieldChange", () => {
    const handleFieldChange = vi.fn();
    const clampAtZeroParse = (rawInputValue) => Math.max(0, Number(rawInputValue));
    render(
      <NumericField
        fieldLabel="X"
        fieldValue={0}
        onFieldChange={handleFieldChange}
        parseInputValue={clampAtZeroParse}
      />,
    );
    fireEvent.change(screen.getByLabelText("X"), { target: { value: "-3" } });
    expect(handleFieldChange).toHaveBeenCalledWith(0);
  });
});

describe("SpeedField", () => {
  it.each([
    ["m/s", 5, 5],
    ["km/h", 5, 18],
  ])(
    "displays fieldValue converted for speedUnit=%s",
    (speedUnit, fieldValue, expectedDisplayedNumber) => {
      render(
        <SpeedField
          fieldLabel="Speed"
          fieldValue={fieldValue}
          speedUnit={speedUnit}
          onFieldChange={() => {}}
          onSpeedUnitChange={() => {}}
          parseInputValue={identityParseInputValue}
        />,
      );
      expect(screen.getByRole("spinbutton")).toHaveValue(expectedDisplayedNumber);
      expect(screen.getByRole("combobox")).toHaveValue(speedUnit);
    },
  );

  it.each([
    ["m/s", "9", 9],
    ["km/h", "36", 10],
  ])(
    "routes edits under speedUnit=%s to onFieldChange in m/s",
    (speedUnit, editedRawValue, expectedFieldValueInMPerS) => {
      const handleFieldChange = vi.fn();
      render(
        <SpeedField
          fieldLabel="Speed"
          fieldValue={0}
          speedUnit={speedUnit}
          onFieldChange={handleFieldChange}
          onSpeedUnitChange={() => {}}
          parseInputValue={identityParseInputValue}
        />,
      );
      fireEvent.change(screen.getByRole("spinbutton"), { target: { value: editedRawValue } });
      expect(handleFieldChange).toHaveBeenCalledWith(expectedFieldValueInMPerS);
    },
  );
});

describe("SelectField", () => {
  const fieldOptions = [
    { value: "a", label: "A" },
    { value: "b", label: "B" },
  ];

  it("calls onFieldChange with the new value when the user picks an option", async () => {
    const user = userEvent.setup();
    const handleFieldChange = vi.fn();
    render(
      <SelectField
        fieldLabel="Mode"
        fieldValue="a"
        onFieldChange={handleFieldChange}
        fieldOptions={fieldOptions}
      />,
    );
    await user.selectOptions(screen.getByLabelText("Mode"), "b");
    expect(handleFieldChange).toHaveBeenCalledWith("b");
  });
});

describe("ColorField", () => {
  it("calls onFieldChange with the new color when the user picks one", () => {
    const handleFieldChange = vi.fn();
    render(
      <ColorField fieldLabel="Color" fieldValue="#000000" onFieldChange={handleFieldChange} />,
    );
    fireEvent.change(screen.getByLabelText("Color"), { target: { value: "#00ff00" } });
    expect(handleFieldChange).toHaveBeenCalledWith("#00ff00");
  });
});
