import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        className="hidden"
        disabled={disabled}
      />
      <Button 
        onClick={handleClick}
        disabled={disabled}
        className="w-full sm:w-auto"
      >
        {disabled ? 'Processing...' : 'Upload CSV File'}
      </Button>
      <p className="mt-2 text-sm text-gray-600">
        Only CSV files are accepted
      </p>
    </div>
  );
};