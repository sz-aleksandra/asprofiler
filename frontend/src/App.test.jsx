import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

vi.mock("./pages/Login/Login", () => ({
  default: () => <div data-testid="page-login" />,
}));
vi.mock("./pages/About/About", () => ({
  default: () => <div data-testid="page-about" />,
}));
vi.mock("./pages/Analysis/Analysis", () => ({
  default: () => <div data-testid="page-analysis" />,
}));
vi.mock("./pages/FilesList/FilesList", () => ({
  default: () => <div data-testid="page-files" />,
}));
vi.mock("./components/shared/ProtectedLayout/ProtectedLayout", async () => {
  const { Outlet } = await vi.importActual("react-router-dom");
  return {
    default: () => (
      <div data-testid="protected">
        <Outlet />
      </div>
    ),
  };
});

import App from "./App";

function renderAt(pathOrEntry) {
  const initialEntries = [pathOrEntry];
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  );
}

describe("App routing", () => {
  it("/login renders Login outside ProtectedLayout", () => {
    renderAt("/login");
    expect(screen.getByTestId("page-login")).toBeInTheDocument();
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
  });

  it("/analysis renders Analysis when analysisResults are present in location state", () => {
    renderAt({ pathname: "/analysis", state: { analysisResults: [{ file_name: "a.csv" }] } });
    expect(screen.getByTestId("protected")).toBeInTheDocument();
    expect(screen.getByTestId("page-analysis")).toBeInTheDocument();
  });

  it("unknown route redirects to /files", () => {
    renderAt("/does-not-exist");
    expect(screen.getByTestId("page-files")).toBeInTheDocument();
    expect(screen.queryByTestId("page-about")).not.toBeInTheDocument();
  });
});
