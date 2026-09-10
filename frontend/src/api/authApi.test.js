import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { getSessionStatus, loginWithPassword } from "./authApi";

describe("authApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getSessionStatus", () => {
    it("GETs /auth/session and returns parsed JSON", async () => {
      const sessionStatus = { authenticated: true };
      fetch.mockResolvedValue({ ok: true, status: 200, json: async () => sessionStatus });

      const sessionStatusResponse = await getSessionStatus();

      expect(sessionStatusResponse).toBe(sessionStatus);
      const [requestUrl, requestOptions] = fetch.mock.calls[0];
      expect(requestUrl).toBe("http://localhost:8000/auth/session");
      expect(requestOptions).toEqual({ credentials: "include", method: "GET" });
    });

    it("propagates errors from apiRequest when backend returns non-ok", async () => {
      fetch.mockResolvedValue({ ok: false, status: 500, text: async () => "nope" });

      await expect(getSessionStatus()).rejects.toMatchObject({ status: 500, message: "nope" });
    });
  });

  describe("loginWithPassword", () => {
    it("POSTs JSON-encoded password to /auth/login and returns parsed JSON", async () => {
      const loginResponse = { authenticated: true };
      fetch.mockResolvedValue({ ok: true, status: 200, json: async () => loginResponse });

      const loginResponseBody = await loginWithPassword("secret");

      expect(loginResponseBody).toBe(loginResponse);
      const [requestUrl, requestOptions] = fetch.mock.calls[0];
      expect(requestUrl).toBe("http://localhost:8000/auth/login");
      expect(requestOptions).toEqual({
        credentials: "include",
        method: "POST",
        body: JSON.stringify({ password: "secret" }),
        headers: { "Content-Type": "application/json" },
      });
    });

    it.each([
      { status: 401, errorText: "bad password" },
      { status: 500, errorText: "boom" },
    ])("propagates status $status from apiRequest", async ({ status, errorText }) => {
      fetch.mockResolvedValue({ ok: false, status, text: async () => errorText });

      await expect(loginWithPassword("whatever")).rejects.toMatchObject({
        status,
        message: errorText,
      });
    });
  });
});
