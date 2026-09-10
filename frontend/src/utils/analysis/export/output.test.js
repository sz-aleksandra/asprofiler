import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { buildCsvFile, downloadBlob, downloadZip } from "./output";

describe("buildCsvFile", () => {
  it("returns object with name and BOM prefixed content ending with newline", () => {
    const csvFile = buildCsvFile("out.csv", ["a", "b"], [[1, 2]]);
    expect(csvFile.name).toBe("out.csv");
    expect(csvFile.content.startsWith("﻿")).toBe(true);
    expect(csvFile.content.endsWith("\n")).toBe(true);
  });

  it("joins header and rows with newline separators", () => {
    const csvFile = buildCsvFile(
      "matrix.csv",
      ["a", "b"],
      [
        [1, 2],
        [3, 4],
      ],
    );
    expect(csvFile.content).toBe("﻿a,b\n1,2\n3,4\n");
  });

  it.each([
    { description: "cell containing comma", cellValue: "hello, world", expected: '"hello, world"' },
    {
      description: "cell containing newline",
      cellValue: "line1\nline2",
      expected: '"line1\nline2"',
    },
    {
      description: "cell containing double quote",
      cellValue: 'he said "hi"',
      expected: '"he said ""hi"""',
    },
  ])("serializes $description with surrounding quotes and escaping", ({ cellValue, expected }) => {
    const csvFile = buildCsvFile("q.csv", ["a"], [[cellValue]]);
    expect(csvFile.content).toContain(expected);
  });

  it.each([
    { nullishValue: null, description: "null" },
    { nullishValue: undefined, description: "undefined" },
  ])("emits empty string for $description cells", ({ nullishValue }) => {
    const csvFile = buildCsvFile("nullish.csv", ["a", "b", "c"], [[nullishValue, nullishValue, 0]]);
    expect(csvFile.content).toBe("﻿a,b,c\n,,0\n");
  });

  it("stringifies numeric cells", () => {
    const csvFile = buildCsvFile("numeric.csv", ["a"], [[1.5]]);
    expect(csvFile.content).toContain("\n1.5\n");
  });
});

describe("downloadBlob", () => {
  let createObjectUrlSpy;
  let revokeObjectUrlSpy;
  let anchorClickSpy;

  beforeEach(() => {
    createObjectUrlSpy = vi.fn(() => "blob:mock-url");
    revokeObjectUrlSpy = vi.fn();
    URL.createObjectURL = createObjectUrlSpy;
    URL.revokeObjectURL = revokeObjectUrlSpy;
    anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    anchorClickSpy.mockRestore();
    delete URL.createObjectURL;
    delete URL.revokeObjectURL;
  });

  it("creates object URL from the blob and triggers a single click", () => {
    const blobContent = new Blob(["hi"], { type: "text/plain" });
    downloadBlob(blobContent, "greet.txt");
    expect(createObjectUrlSpy).toHaveBeenCalledWith(blobContent);
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
  });

  it("revokes the object URL after click", () => {
    downloadBlob(new Blob(["value"]), "value.txt");
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:mock-url");
  });

  it("removes the anchor from the DOM after triggering the click", () => {
    const bodyChildCountBefore = document.body.childElementCount;
    downloadBlob(new Blob(["value"]), "value.txt");
    expect(document.body.childElementCount).toBe(bodyChildCountBefore);
  });

  it("sets download attribute on the anchor to the requested file name", () => {
    let capturedDownloadAttribute = null;
    anchorClickSpy.mockImplementationOnce(function captureDownloadAttribute() {
      capturedDownloadAttribute = this.download;
    });
    downloadBlob(new Blob(["value"]), "custom-name.txt");
    expect(capturedDownloadAttribute).toBe("custom-name.txt");
  });
});

describe("downloadZip", () => {
  let createObjectUrlSpy;
  let revokeObjectUrlSpy;
  let anchorClickSpy;

  beforeEach(() => {
    createObjectUrlSpy = vi.fn(() => "blob:mock-url");
    revokeObjectUrlSpy = vi.fn();
    URL.createObjectURL = createObjectUrlSpy;
    URL.revokeObjectURL = revokeObjectUrlSpy;
    anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    anchorClickSpy.mockRestore();
    delete URL.createObjectURL;
    delete URL.revokeObjectURL;
  });

  it("builds a zip blob from the archive entries and triggers download", async () => {
    await downloadZip(
      [
        { name: "a.txt", content: "alpha" },
        { name: "sub/b.txt", content: "beta" },
      ],
      "bundle.zip",
    );
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    const generatedBlob = createObjectUrlSpy.mock.calls[0][0];
    expect(generatedBlob).toBeInstanceOf(Blob);
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:mock-url");
  });
});
