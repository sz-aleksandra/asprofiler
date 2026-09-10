import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../api/authApi", () => ({
  getSessionStatus: vi.fn(),
  loginWithPassword: vi.fn(),
}));

import { getSessionStatus, loginWithPassword } from "../../api/authApi";

import Login from "./Login";

function renderLogin({ initialEntries = ["/login"], state } = {}) {
  const entries = state ? [{ pathname: "/login", state }] : initialEntries;
  return render(
    <MemoryRouter initialEntries={entries}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/files" element={<div>Files Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Login integration", () => {
  beforeEach(() => {
    getSessionStatus.mockReset();
    loginWithPassword.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /files when session already authenticated", async () => {
    getSessionStatus.mockResolvedValue({ authenticated: true });
    renderLogin();
    await waitFor(() => expect(screen.getByText("Files Page")).toBeInTheDocument());
  });

  it("submits password and navigates to /files on success", async () => {
    getSessionStatus.mockResolvedValue({ authenticated: false });
    loginWithPassword.mockResolvedValue({ authenticated: true });
    renderLogin();
    const input = await screen.findByPlaceholderText(/enter password/i);
    await userEvent.type(input, "secret");
    await userEvent.click(screen.getByRole("button", { name: /unlock/i }));

    expect(loginWithPassword).toHaveBeenCalledWith("secret");
    await waitFor(() => expect(screen.getByText("Files Page")).toBeInTheDocument());
  });

  it("shows 'Invalid password.' on 401", async () => {
    getSessionStatus.mockResolvedValue({ authenticated: false });
    const err = new Error("bad");
    err.status = 401;
    loginWithPassword.mockRejectedValue(err);
    renderLogin();
    await userEvent.type(await screen.findByPlaceholderText(/enter password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /unlock/i }));
    await waitFor(() => expect(screen.getByText(/invalid password/i)).toBeInTheDocument());
  });

  it("shows generic 'Login failed.' on non-401 errors", async () => {
    getSessionStatus.mockResolvedValue({ authenticated: false });
    const err = new Error("boom");
    err.status = 500;
    loginWithPassword.mockRejectedValue(err);
    renderLogin();
    await userEvent.type(await screen.findByPlaceholderText(/enter password/i), "x");
    await userEvent.click(screen.getByRole("button", { name: /unlock/i }));
    await waitFor(() => expect(screen.getByText(/login failed/i)).toBeInTheDocument());
  });
});
