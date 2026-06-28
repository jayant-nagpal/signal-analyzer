import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';

interface Props {
  onFile: (file: File) => void;
  onSample: () => void;
  error: string | null;
  uploading: boolean;
  uploadStage: string;
}

export function EmptyState({ onFile, onSample, error, uploading, uploadStage }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  }

  if (uploading) {
    return (
      <div className="empty-state">
        <div className="upload-state">
          <div className="spinner" />
          <span>{uploadStage}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <div className="empty-icon">
        <UploadCloud size={24} />
      </div>
      <h2 className="empty-title">Signal Analyzer</h2>
      <p className="empty-subtitle">
        Upload a CSV, XLSX, or parquet file with trading signals. Each row is one candidate signal.
      </p>

      <div
        className={`dropzone${dragOver ? ' drag-over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        aria-label="Upload a signal file"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
      >
        <div className="dropzone-text">Drop your file here, or click to browse</div>
        <div className="dropzone-hint">CSV · XLSX · XLS · Parquet</div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.parquet"
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      <div className="btn-row">
        <button className="btn-primary" onClick={() => inputRef.current?.click()}>
          Upload file
        </button>
        <button className="btn-secondary" onClick={onSample}>
          Load sample data
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}
    </div>
  );
}
