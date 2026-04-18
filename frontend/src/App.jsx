import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedLayout from "./components/ProtectedLayout/ProtectedLayout";
import About from "./pages/About/About";
import Analysis from "./pages/Analysis/Analysis";
import FilesList from "./pages/FilesList/FilesList";
import LoginPage from "./pages/Login/LoginPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/about" replace />} />
        <Route path="/about" element={<About />} />
        <Route path="/files" element={<FilesList />} />
        <Route path="/analysis" element={<Analysis />} />
      </Route>
    </Routes>
  );
}
