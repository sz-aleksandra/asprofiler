import { useEffect, useMemo, useState } from "react";

import Dropzone from "../../components/Dropzone/Dropzone";
import FilesTable from "../../components/FilesTable/FilesTable";
import Toast from "../../components/Toast/Toast";

import { deleteFile, deleteFiles, listFiles, uploadFiles } from "../../services/filesApi";

import styles from "./FilesUpload.module.css";

export default function FilesUpload() {
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

  const onFiles = async (picked) => {
    setBusy(true);
    try {
      await uploadFiles(picked);
      await refresh();
      setToast({ message: `Added ${picked.length} file(s).`, type: "success" });
    } catch (e) {
      setToast({ message: String(e.message || e), type: "error" });
    } finally {
      setBusy(false);
    }
  };

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

  const onDeleteOne = async (name) => {
    setBusy(true);
    try {
      await deleteFile(name);
      await refresh();
      setToast({ message: `Deleted: ${name}`, type: "success" });
    } catch (e) {
      setToast({ message: String(e.message || e), type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onDeleteSelected = async () => {
    if (!selected.size) return;

    setBusy(true);
    try {
      await deleteFiles([...selected]);
      setSelected(new Set());
      await refresh();
      setToast({ message: "Deleted selected files.", type: "success" });
    } catch (e) {
      setToast({ message: String(e.message || e), type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => a.name.localeCompare(b.name));
  }, [files]);

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Upload Files</h1>

      <Dropzone onFiles={onFiles} />

      <FilesTable
        files={sortedFiles}
        selected={selected}
        onToggleOne={onToggleOne}
        onToggleAll={onToggleAll}
        onDeleteOne={onDeleteOne}
        onDeleteSelected={onDeleteSelected}
        busy={busy}
      />

      <Toast message={toast.message} type={toast.type} onClose={closeToast} />
    </section>
  );
}
