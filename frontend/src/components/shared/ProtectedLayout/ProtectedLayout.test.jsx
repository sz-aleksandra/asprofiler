import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../api/authApi", () => ({
  getSessionStatus: vi.fn(),
}));

vi.mock("../Layout/Layout", () => ({
  default: () => <div>Protected content</div>,
}));

import { getSessionStatus } from "../../../api/authApi";

import ProtectedLayout from "./ProtectedLayout";

function renderProtected(initialEntry = "/analysis") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<ProtectedLayout />}>
          <Route path="/analysis" element={<div>Analysis inner</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedLayout integration", () => {
  beforeEach(() => {
    getSessionStatus.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /login when unauthenticated", async () => {
    getSessionStatus.mockResolvedValue({ authenticated: false });
    renderProtected();
    await waitFor(() => expect(screen.getByText("Login page")).toBeInTheDocument());
  });

  it("renders Layout when authenticated", async () => {
    getSessionStatus.mockResolvedValue({ authenticated: true });
    renderProtected();
    await waitFor(() => expect(screen.getByText("Protected content")).toBeInTheDocument());
  });
});
