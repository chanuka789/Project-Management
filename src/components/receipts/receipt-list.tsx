'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PasswordConfirmModal } from '@/components/ui/password-confirm-modal';
import { FileViewer } from './file-viewer';
import { FileText, Download, Trash2, Calendar, User, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { PaymentReceiptWithDetails } from '@/types/database';

interface ReceiptListProps {
  projectId?: string;
  paymentId?: string;
  showProjectInfo?: boolean;
  refreshTrigger?: number;
}

export function ReceiptList({ projectId, paymentId, showProjectInfo, refreshTrigger }: ReceiptListProps) {
  const [receipts, setReceipts] = useState<PaymentReceiptWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<PaymentReceiptWithDetails | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [receiptToView, setReceiptToView] = useState<PaymentReceiptWithDetails | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchReceipts();
  }, [projectId, paymentId, refreshTrigger]);

  const fetchReceipts = async () => {
    try {
      let query = supabase
        .from('payment_receipts')
        .select('*, project:projects(*), payment:payments(*), uploader:users!uploaded_by(*)')
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      if (paymentId) {
        query = query.eq('payment_id', paymentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (receipt: PaymentReceiptWithDetails) => {
    try {
      const { data, error } = await supabase.storage
        .from('payment-receipts')
        .download(receipt.file_path);

      if (error) throw error;

      // Create download link
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

  const handleView = (receipt: PaymentReceiptWithDetails) => {
    setReceiptToView(receipt);
    setViewerOpen(true);
  };

  const handleDeleteClick = (receipt: PaymentReceiptWithDetails) => {
    setReceiptToDelete(receipt);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!receiptToDelete) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('payment-receipts')
        .remove([receiptToDelete.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('payment_receipts')
        .delete()
        .eq('id', receiptToDelete.id);

      if (dbError) throw dbError;

      // Update local state
      setReceipts(receipts.filter(r => r.id !== receiptToDelete.id));
      setReceiptToDelete(null);
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Failed to delete receipt');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No receipts uploaded yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {receipts.map((receipt) => (
          <Card key={receipt.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="text-3xl flex-shrink-0">{getFileIcon(receipt.file_type)}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{receipt.file_name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{formatFileSize(receipt.file_size)}</p>
                    {receipt.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{receipt.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(receipt.created_at)}
                      </span>
                      {receipt.uploader && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {receipt.uploader.full_name}
                        </span>
                      )}
                    </div>
                    {showProjectInfo && receipt.project && (
                      <p className="text-sm text-primary mt-2">
                        Project: {receipt.project.name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleView(receipt)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(receipt)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteClick(receipt)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PasswordConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setReceiptToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Receipt"
        description="This will permanently delete this receipt file."
        itemName={receiptToDelete?.file_name}
      />

      {receiptToView && (
        <FileViewer
          receipt={receiptToView}
          isOpen={viewerOpen}
          onClose={() => {
            setViewerOpen(false);
            setReceiptToView(null);
          }}
        />
      )}
    </>
  );
}
