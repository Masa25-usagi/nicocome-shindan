import { useState, useRef } from 'react';

type Props = {
  onFileLoaded: (fileName: string, content: string) => void;
};

export default function FileUploader({ onFileLoaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onFileLoaded(file.name, reader.result);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className={`upload-zone ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <span className="upload-zone__icon">📂</span>
      <p className="upload-zone__text">
        コメントファイルをドロップ、またはクリックして選択
      </p>
      <p className="upload-zone__hint">
        対応形式: .nicojk / .xml / .json / .csv / .txt
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".nicojk,.xml,.json,.csv,.txt"
        onChange={handleChange}
      />
    </div>
  );
}
