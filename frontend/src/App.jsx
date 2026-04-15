import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import About from "./pages/About/About";
import Analysis from "./pages/Analysis/Analysis";
import FilesList from "./pages/FilesList/FilesList";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/about" replace />} />
        <Route path="/about" element={<About />} />
        <Route path="/files" element={<FilesList />} />
        <Route path="/analysis" element={<Analysis />} />
      </Route>
    </Routes>
  );
}
