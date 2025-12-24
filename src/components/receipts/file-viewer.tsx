'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { X, Download, Maximize2, Minimize2, FileText } from 'lucide-react';
import type { PaymentReceiptWithDetails } from '@/types/database';

interface FileViewerProps {
  receipt: PaymentReceiptWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

export function FileViewer({ receipt, isOpen, onClose }: FileViewerProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const supabase = createClient();

  const isPDF = receipt.file_type === 'application/pdf';
  const isExcel = receipt.file_type.includes('excel') || receipt.file_type.includes('spreadsheet');
  const isWord = receipt.file_type.includes('word') || receipt.file_type.includes('document');

  const handleOpen = async () => {
    if (!fileUrl) {
      setIsLoading(true);
      const { data } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(receipt.file_path);

      setFileUrl(data.publicUrl);
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('payment-receipts')
        .download(receipt.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = receipt.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  // Load file URL when modal opens
  if (isOpen && !fileUrl && !isLoading) {
    handleOpen();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={receipt.file_name}
      size={isFullscreen ? 'full' : 'xl'}
      className="file-viewer-modal"
    >
      <div className="space-y-4">
        {/* Header Actions */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="h-4 w-4" />
            <span>{(receipt.file_size / 1024 / 1024).toFixed(2)} MB</span>
            <span>•</span>
            <span>{receipt.file_type.split('/')[1].toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-4 w-4 mr-2" />
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Fullscreen
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        {/* File Viewer */}
        <div
          className={`relative bg-gray-50 rounded-lg overflow-hidden ${
            isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-[600px]'
          }`}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-gray-600">Loading file...</p>
              </div>
            </div>
          )}

          {!isLoading && fileUrl && (
            <>
              {isPDF ? (
                <iframe
                  src={fileUrl}
                  className="w-full h-full border-0 animate-fade-in"
                  title={receipt.file_name}
                  onLoad={() => setIsLoading(false)}
                />
              ) : isExcel || isWord ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
                  <div className="bg-white rounded-lg p-8 shadow-lg max-w-md">
                    <div className="text-6xl mb-4">
                      {isExcel ? '📊' : '📝'}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {isExcel ? 'Excel File' : 'Word Document'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Preview not available. Please download to view this file.
                    </p>
                    <div className="space-y-3">
                      <Button
                        onClick={handleDownload}
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download to View
                      </Button>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <Button variant="outline" className="w-full">
                          Open in New Tab
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Preview not available for this file type</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Description */}
        {receipt.description && (
          <div className="pt-3 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-1">Description:</p>
            <p className="text-sm text-gray-600">{receipt.description}</p>
          </div>
        )}

        {/* Project Info */}
        {receipt.project && (
          <div className="pt-3 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-1">Project:</p>
            <p className="text-sm text-primary font-medium">{receipt.project.name}</p>
          </div>
        )}
      </div>

      <style jsx global>{`
        .file-viewer-modal {
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease-in;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </Modal>
  );
}
