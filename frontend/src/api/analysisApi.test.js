import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { postSelectedFilesAnalysis } from "./analysisApi";

describe("analysisApi.postSelectedFilesAnalysis", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs the FormData to /analysis/analyze and returns parsed JSON", async () => {
    const analysisResult = { events: [], profiles: {} };
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => analysisResult });
    const selectedFilesAnalysisFormData = new FormData();
    selectedFilesAnalysisFormData.append(
      "file",
      new Blob(["pitch,speed"], { type: "text/csv" }),
      "session.csv",
    );

    const analysisResponse = await postSelectedFilesAnalysis(selectedFilesAnalysisFormData);

    expect(analysisResponse).toBe(analysisResult);
    const [requestUrl, requestOptions] = fetch.mock.calls[0];
    expect(requestUrl).toBe("http://localhost:8000/analysis/analyze");
    expect(requestOptions).toEqual({
      credentials: "include",
      method: "POST",
      body: selectedFilesAnalysisFormData,
    });
  });

  it("propagates errors from apiRequest when backend returns non-ok", async () => {
    fetch.mockResolvedValue({ ok: false, status: 400, text: async () => "invalid file" });

    const thrownError = await postSelectedFilesAnalysis(new FormData()).catch((error) => error);

    expect(thrownError).toBeInstanceOf(Error);
    expect(thrownError.status).toBe(400);
    expect(thrownError.message).toBe("invalid file");
  });
});
