import Button from "../../../ui/Button/Button";
import Checkbox from "../../../ui/form/controls/Checkbox/Checkbox";

import styles from "./FilesSelectionTable.module.css";
const AnalyzeFileButton = ({ onAnalyzeFile, isDisabled, children }) => (
  <Button
    type="button"
    buttonVariant="primaryOutline"
    disabled={isDisabled}
    onClick={onAnalyzeFile}
  >
    {children}
  </Button>
);
const RemoveFileButton = ({ onRemoveFile, isDisabled, children }) => (
  <Button type="button" buttonVariant="primary" disabled={isDisabled} onClick={onRemoveFile}>
    {children}
  </Button>
);
function formatFileSize(fileSizeBytes) {
  if (fileSizeBytes < 1024) return `${fileSizeBytes} B`;
  if (fileSizeBytes < 1024 * 1024) return `${(fileSizeBytes / 1024).toFixed(1)} KB`;
  return `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
export default function FilesSelectionTable({
  filesSelection,
  isAnalyzingSelectedFiles,
  runSelectedFilesAnalysis,
  renderSelectedFileParamsForm,
}) {
  return (
    <div className={styles.filesSelectionTable}>
      <div className={styles.tableSelectionToolbar}>
        <label className={styles.allToggle}>
          <Checkbox
            checked={filesSelection.allSelected}
            disabled={!filesSelection.files.length || isAnalyzingSelectedFiles}
            onChange={(changeEvent) =>
              filesSelection.toggleAllFilesSelection(changeEvent.target.checked)
            }
          />
          <span>Select all</span>
        </label>
        <div className={styles.actionsGroup}>
          <AnalyzeFileButton
            isDisabled={!filesSelection.selectedFileNames.size || isAnalyzingSelectedFiles}
            onAnalyzeFile={() => runSelectedFilesAnalysis([...filesSelection.selectedFileNames])}
          >
            Analyze selected
          </AnalyzeFileButton>
          <RemoveFileButton
            isDisabled={!filesSelection.selectedFileNames.size || isAnalyzingSelectedFiles}
            onRemoveFile={filesSelection.removeSelectedFiles}
          >
            Remove selected
          </RemoveFileButton>
        </div>
      </div>
      <div className={`${styles.row} ${styles.headerRow}`}>
        <div className={styles.checkboxCell} />
        <div className={styles.fileNameCell}>File name</div>
        <div className={styles.sizeCell}>Size</div>
        <div className={styles.actionsCell} />
      </div>
      {filesSelection.files.map((file) => {
        const isFileSelected = filesSelection.selectedFileNames.has(file.name);
        return (
          <div className={styles.block} key={file.name}>
            <div className={`${styles.row} ${isFileSelected ? styles.rowExpanded : ""}`}>
              <div className={styles.checkboxCell}>
                <Checkbox
                  checked={isFileSelected}
                  disabled={isAnalyzingSelectedFiles}
                  onChange={() => filesSelection.toggleFileSelection(file.name)}
                />
              </div>
              <div className={styles.fileNameCell}>{file.name}</div>
              <div className={styles.sizeCell}>{formatFileSize(file.size)}</div>
              <div className={styles.actionsCell}>
                <AnalyzeFileButton
                  isDisabled={isAnalyzingSelectedFiles}
                  onAnalyzeFile={() => runSelectedFilesAnalysis([file.name])}
                >
                  Analyze
                </AnalyzeFileButton>
                <RemoveFileButton
                  isDisabled={isAnalyzingSelectedFiles}
                  onRemoveFile={() => filesSelection.removeFile(file.name)}
                >
                  Remove
                </RemoveFileButton>
              </div>
            </div>
            {isFileSelected && (
              <div className={styles.expandedParams}>{renderSelectedFileParamsForm(file)}</div>
            )}
          </div>
        );
      })}
      {!filesSelection.files.length && <div className={styles.emptyRow}>No files yet.</div>}
    </div>
  );
}
