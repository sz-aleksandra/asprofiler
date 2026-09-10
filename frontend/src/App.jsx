import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import ProtectedLayout from "./components/shared/ProtectedLayout/ProtectedLayout";
import About from "./pages/About/About";
import Analysis from "./pages/Analysis/Analysis";
import FilesList from "./pages/FilesList/FilesList";
import Login from "./pages/Login/Login";
export function AnalysisRoute() {
  const location = useLocation();
  if (!location.state?.analysisResults?.length) return <Navigate replace to="/files" />;
  return <Analysis analysisState={location.state} />;
}
export default function App() {
  return (
    <Routes>
      <Route element={<Login />} path="/login" />
      <Route element={<ProtectedLayout />}>
        <Route element={<About />} path="/about" />
        <Route element={<FilesList />} path="/files" />
        <Route element={<AnalysisRoute />} path="/analysis" />
        <Route element={<Navigate replace to="/files" />} path="*" />
      </Route>
    </Routes>
  );
}
