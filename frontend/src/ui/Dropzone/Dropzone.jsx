import { useRef, useState } from "react";

import styles from "./Dropzone.module.css";
export default function Dropzone({ onFilesPicked }) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const openFilePicker = () => inputRef.current.click();
  const handleFilesPicked = (pickedFilesList) => {
    const pickedFilesArray = Array.from(pickedFilesList);
    if (pickedFilesArray.length) onFilesPicked(pickedFilesArray);
  };
  return (
    <div>
      <div
        className={`${styles.area} ${isDragOver ? styles.areaDragOver : ""}`}
        onClick={openFilePicker}
        onDragEnter={() => setIsDragOver(true)}
        onDragLeave={() => setIsDragOver(false)}
        onDragOver={(dragEvent) => {
          dragEvent.preventDefault();
          setIsDragOver(true);
        }}
        onDrop={(dropEvent) => {
          dropEvent.preventDefault();
          setIsDragOver(false);
          handleFilesPicked(dropEvent.dataTransfer.files);
        }}
      >
        <span>Drag and drop .csv files or click to choose from folder</span>
      </div>

      <input
        type="file"
        accept=".csv,text/csv"
        className={styles.hiddenFileInput}
        multiple
        onChange={(filePickerChangeEvent) => {
          handleFilesPicked(filePickerChangeEvent.target.files);
          filePickerChangeEvent.target.value = "";
        }}
        ref={inputRef}
      />
    </div>
  );
}
