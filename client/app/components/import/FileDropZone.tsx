import { useCallback, useRef, useState } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatFileSize } from "~/lib/utils";
import { Button } from "~/components/ui/Button";
import { toast } from "~/components/ui/Toast";

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  accept?: string;
  maxSizeMB?: number;
}

export function FileDropZone({
  onFileSelect,
  disabled = false,
  accept = ".csv,.xlsx",
  maxSizeMB = 10,
}: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateAndSelect = useCallback(
    (file: File) => {
      if (file.size > maxSizeBytes) {
        toast.error(
          `El archivo excede el tamano maximo de ${maxSizeMB}MB (${formatFileSize(file.size)})`,
        );
        return;
      }

      const extension = file.name.split(".").pop()?.toLowerCase();
      const allowedExtensions = accept
        .split(",")
        .map((ext) => ext.trim().replace(".", "").toLowerCase());

      if (extension && !allowedExtensions.includes(extension)) {
        toast.error(
          `Formato no soportado. Usa: ${accept}`,
        );
        return;
      }

      setSelectedFile(file);
      onFileSelect(file);
    },
    [accept, maxSizeBytes, maxSizeMB, onFileSelect],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) validateAndSelect(file);
    },
    [disabled, validateAndSelect],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSelect(file);
      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [validateAndSelect],
  );

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleRemove = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const acceptFormats = accept
    .split(",")
    .map((ext) => ext.trim().toUpperCase().replace(".", ""))
    .join(", ");

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      <AnimatePresence mode="wait">
        {selectedFile ? (
          <motion.div
            key="file-selected"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex items-center gap-4 rounded-xl border-2 border-primary-200 bg-primary-50/50 p-4",
              "dark:border-primary-800 dark:bg-primary-900/20",
            )}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/40">
              <FileSpreadsheet className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                {selectedFile.name}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleRemove}
              disabled={disabled}
              aria-label="Eliminar archivo"
            >
              <X className="h-4 w-4 text-neutral-500" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="drop-zone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all duration-200",
              "border-neutral-300 bg-neutral-50 hover:border-primary-400 hover:bg-primary-50/30",
              "dark:border-neutral-700 dark:bg-neutral-900/50 dark:hover:border-primary-600 dark:hover:bg-primary-900/10",
              isDragOver &&
                "border-primary-500 bg-primary-50 ring-4 ring-primary-500/10 dark:border-primary-500 dark:bg-primary-900/20 dark:ring-primary-500/20",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
                "bg-neutral-100 group-hover:bg-primary-100 dark:bg-neutral-800 dark:group-hover:bg-primary-900/40",
                isDragOver && "bg-primary-100 dark:bg-primary-900/40",
              )}
            >
              <Upload
                className={cn(
                  "h-6 w-6 transition-colors",
                  "text-neutral-400 group-hover:text-primary-500 dark:text-neutral-500 dark:group-hover:text-primary-400",
                  isDragOver && "text-primary-500 dark:text-primary-400",
                )}
              />
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Arrastra tu archivo aqui o{" "}
                <span className="text-primary-600 dark:text-primary-400">
                  haz clic para seleccionar
                </span>
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Formatos: {acceptFormats} &middot; Max {maxSizeMB}MB
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
