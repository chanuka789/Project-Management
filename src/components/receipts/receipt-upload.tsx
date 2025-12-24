'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import type { PaymentReceipt } from '@/types/database';

interface ReceiptUploadProps {
  projectId: string;
  paymentId?: string;
  onUploadComplete?: (receipt: PaymentReceipt) => void;
}

const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const FILE_TYPE_EXTENSIONS = {
  'application/pdf': '.pdf',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

export function ReceiptUpload({ projectId, paymentId, onUploadComplete }: ReceiptUploadProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setError('Please select a PDF, Excel (.xls, .xlsx), or Word (.doc, .docx) file');
      setSelectedFile(null);
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to upload files');
      }

      // Generate unique file name
      const timestamp = Date.now();
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${projectId}/${timestamp}-${selectedFile.name}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(fileName);

      // Save metadata to database
      const { data: receipt, error: dbError } = await supabase
        .from('payment_receipts')
        .insert({
          project_id: projectId,
          payment_id: paymentId || null,
          file_name: selectedFile.name,
          file_path: fileName,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          description: description || null,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (dbError) {
        // Rollback: Delete uploaded file
        await supabase.storage.from('payment-receipts').remove([fileName]);
        throw dbError;
      }

      // Success
      setShowModal(false);
      setSelectedFile(null);
      setDescription('');
      if (onUploadComplete && receipt) {
        onUploadComplete(receipt);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setShowModal(true)} variant="outline" size="sm">
        <Upload className="h-4 w-4 mr-2" />
        Upload Receipt
      </Button>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedFile(null);
          setDescription('');
          setError(null);
        }}
        title="Upload Payment Receipt"
        description="Upload a PDF, Excel, or Word document"
        size="md"
      >
        <div className="space-y-4">
          {/* File Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".pdf,.xls,.xlsx,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
                id="receipt-file-input"
              />
              <label
                htmlFor="receipt-file-input"
                className="flex-1 cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <File className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {selectedFile ? selectedFile.name : 'Click to select file'}
                </span>
              </label>
              {selectedFile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Accepted formats: PDF, Excel (.xls, .xlsx), Word (.doc, .docx) - Max 10MB
            </p>
          </div>

          {/* File Info */}
          {selectedFile && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">File size:</span>
                <span className="font-medium">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-gray-600">File type:</span>
                <span className="font-medium">{selectedFile.type.split('/')[1].toUpperCase()}</span>
              </div>
            </div>
          )}

          {/* Description */}
          <Textarea
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add notes about this receipt..."
            rows={3}
          />

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                setSelectedFile(null);
                setDescription('');
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              isLoading={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
