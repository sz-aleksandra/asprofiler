import { useRef, useState } from "react";
import styles from "./Dropzone.module.css";

export default function Dropzone({ onFiles }) {
  const inputRef = useRef(null);
  const [isOver, setIsOver] = useState(false);

  const pick = () => inputRef.current?.click();

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length) onFiles(files);
  };

  return (
    <section className={styles.wrap}>
      <div
        className={`${styles.zone} ${isOver ? styles.over : ""}`}
        role="button"
        tabIndex={0}
        onClick={pick}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? pick() : null)}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <span>Drag and drop .csv files or click to choose from folder</span>
      </div>

      <input
        ref={inputRef}
        className={styles.hidden}
        type="file"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
      />
    </section>
  );
}
