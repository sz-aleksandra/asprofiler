import { useEffect, useMemo, useState } from "react";

import FilesTable from "../../components/FilesTable/FilesTable";
import Toast from "../../components/Toast/Toast";

import { listFiles } from "../../services/filesApi";

import styles from "./FilesList.module.css";

export default function FilesList() {
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });

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
      setToast({ message: `Analyzing: ${name}`, type: "success" });
    } finally {
      setBusy(false);
    }
  };

  const onAnalyzeSelected = async () => {
    if (!selected.size) return;
    setBusy(true);
    try {
      setToast({
        message: `Analyzing ${selected.size} file(s): ${[...selected].slice(0, 3).join(", ")}${
          selected.size > 3 ? "…" : ""
        }`,
        type: "success",
      });
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
