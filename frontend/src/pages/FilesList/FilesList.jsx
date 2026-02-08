import { useEffect, useMemo, useState } from "react";

import FilesTable from "../../components/FilesTable/FilesTable";
import Toast from "../../components/Toast/Toast";

import { useNavigate } from "react-router-dom";
import { analyzeFiles, listFiles } from "../../services/filesApi";

import styles from "./FilesList.module.css";

export default function FilesList() {
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });
  const navigate = useNavigate();

  const closeToast = () => setToast({ message: "", type: "info" });

  const refresh = async () => {
    const data = await listFiles();
    setFiles(data);
    setSelected((prev) => {
      const existing = new Set(data.map((x) => x.name));
      return new Set([...prev].filter((n) => existing.has(n)));
    });
  };

  useEffect(() => {
    refresh().catch((e) => setToast({ message: String(e.message || e), type: "error" }));
  }, []);

  const onToggleOne = (name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const onToggleAll = (value) => {
    if (!value) return setSelected(new Set());
    setSelected(new Set(files.map((f) => f.name)));
  };

  const onAnalyzeOne = async (name) => {
    setBusy(true);
    try {
      const res = await analyzeFiles([name]);
      const first = res?.results?.[0]?.profile?.fit;
      if (first) {
        const payload = [{ name, profile: res.results[0].profile }];
        localStorage.setItem("analysis_results", JSON.stringify(payload));
        navigate("/analysis", {
          state: { results: payload },
        });
        setToast({
          message: `Analyzed ${name}. A0=${first.A0.toFixed(3)}, S0=${first.S0.toFixed(
            3,
          )}, slope=${first.AS_slope.toFixed(3)}, R²=${first.r2.toFixed(3)}`,
          type: "success",
        });
      } else {
        setToast({ message: `Analyzed ${name}.`, type: "success" });
      }
    } catch (e) {
      setToast({ message: String(e.message || e), type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onAnalyzeSelected = async () => {
    if (!selected.size) return;
    setBusy(true);
    try {
      const res = await analyzeFiles([...selected]);
      const okResults = res?.results?.filter((r) => r.profile) || [];
      const ok = okResults.length;
      if (okResults[0]) {
        const payload = okResults.map((r) => ({ name: r.name, profile: r.profile }));
        localStorage.setItem("analysis_results", JSON.stringify(payload));
        navigate("/analysis", {
          state: { results: payload },
        });
      }
      setToast({
        message: `Analyzed ${ok}/${selected.size} file(s): ${[...selected].slice(0, 3).join(", ")}${
          selected.size > 3 ? "…" : ""
        }`,
        type: ok ? "success" : "error",
      });
    } catch (e) {
      setToast({ message: String(e.message || e), type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const sortedFiles = useMemo(
    () => [...files].sort((a, b) => a.name.localeCompare(b.name)),
    [files],
  );

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Files List</h1>

      <FilesTable
        mode="analyze"
        files={sortedFiles}
        selected={selected}
        onToggleOne={onToggleOne}
        onToggleAll={onToggleAll}
        onAnalyzeOne={onAnalyzeOne}
        onAnalyzeSelected={onAnalyzeSelected}
        busy={busy}
      />

      <Toast message={toast.message} type={toast.type} onClose={closeToast} />
    </section>
  );
}
