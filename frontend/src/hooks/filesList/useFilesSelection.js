import { useState } from "react";

export default function useFilesSelection() {
  const [files, setFiles] = useState([]);
  const [selectedFileNames, setSelectedFileNames] = useState(() => new Set());

  return {
    files,
    selectedFileNames,
    allSelected: files.length > 0 && selectedFileNames.size === files.length,
    pickFiles: (filesToPick) => {
      setFiles((previousFiles) => {
        const filesByName = new Map(
          previousFiles.map((previousFile) => [previousFile.name, previousFile]),
        );
        filesToPick.forEach((fileToPick) => filesByName.set(fileToPick.name, fileToPick));
        return [...filesByName.values()].sort((firstFile, secondFile) =>
          firstFile.name.localeCompare(secondFile.name),
        );
      });
    },
    toggleFileSelection: (fileNameToSelect) => {
      setSelectedFileNames((previousSelectedFileNames) => {
        const nextSelectedFileNames = new Set(previousSelectedFileNames);
        if (nextSelectedFileNames.has(fileNameToSelect))
          nextSelectedFileNames.delete(fileNameToSelect);
        else nextSelectedFileNames.add(fileNameToSelect);
        return nextSelectedFileNames;
      });
    },
    toggleAllFilesSelection: (shouldSelectAll) =>
      setSelectedFileNames(
        shouldSelectAll ? new Set(files.map((fileToSelect) => fileToSelect.name)) : new Set(),
      ),
    removeFile: (fileNameToRemove) => {
      setFiles((previousFiles) =>
        previousFiles.filter((previousFile) => previousFile.name !== fileNameToRemove),
      );
      setSelectedFileNames((previousSelectedFileNames) => {
        const nextSelectedFileNames = new Set(previousSelectedFileNames);
        nextSelectedFileNames.delete(fileNameToRemove);
        return nextSelectedFileNames;
      });
    },
    removeSelectedFiles: () => {
      setFiles((previousFiles) =>
        previousFiles.filter((previousFile) => !selectedFileNames.has(previousFile.name)),
      );
      setSelectedFileNames(new Set());
    },
  };
}
