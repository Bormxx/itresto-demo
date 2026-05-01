'use client';

import { useTranslations } from 'next-intl';
import { DashboardLayout, PageHeader } from '@/components/layouts';

interface TableWithQR {
  id: string;
  number: string;
  capacity: number | null;
  qrCode: string | null;
  url: string;
}

interface QRCodesClientProps {
  tables: TableWithQR[];
}

export default function QRCodesClient({ tables }: QRCodesClientProps) {
  const t = useTranslations('qrcodes');
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] p-4">
      <DashboardLayout>
        <PageHeader
          title={t('title')}
          description={t('description')}
          action={
            <button
              onClick={handlePrint}
              className="rounded-lg bg-[#2563eb] px-6 py-3 font-semibold text-[#ffffff] hover:bg-[#1d4ed8] print:hidden"
            >
              🖨️ {t('printAll')}
            </button>
          }
        />

        {/* Grid of QR codes */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 print:grid-cols-2">
          {tables.map((table) => (
            <div
              key={table.id}
              className="break-inside-avoid rounded-lg border-2 border-[#d1d5db] bg-[#ffffff] p-6 shadow-sm print:border-[#000000]"
              style={{ pageBreakInside: 'avoid' }}
            >
              {/* Table number */}
              <div className="mb-4 text-center">
                <h2 className="text-3xl font-bold text-[#111827]">
                  {t('table')} {table.number}
                </h2>
                <p className="text-sm text-[#4b5563]">
                  {t('capacity')}: {table.capacity} {t('people')}
                </p>
              </div>

              {/* QR Code */}
              {table.qrCode && (
                <div className="mb-4 flex justify-center">
                  <img
                    src={table.qrCode}
                    alt={`QR ${t('table')} ${table.number}`}
                    className="h-auto w-full max-w-[250px]"
                  />
                </div>
              )}

              {/* Instructions */}
              <div className="rounded-lg bg-[#f9fafb] p-4 text-center print:bg-[#f3f4f6]">
                <p className="text-sm font-semibold text-[#111827]">
                  {t('scanToOrder')}
                </p>
                <p className="mt-1 text-xs text-[#4b5563]">
                  {t('scanInstruction')}
                </p>
              </div>

              {/* URL for reference (hidden in print) */}
              <div className="mt-3 text-center text-xs text-[#9ca3af] print:hidden">
                {table.url}
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {tables.length === 0 && (
          <div className="rounded-lg bg-[#ffffff] p-12 text-center shadow">
            <p className="text-[#4b5563]">
              {t('emptyState')}
            </p>
          </div>
        )}
      </DashboardLayout>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:grid-cols-2 {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .print\\:border-\\[\\#000000\\] {
            border-color: #000000 !important;
          }
          .print\\:bg-\\[\\#f3f4f6\\] {
            background-color: #f3f4f6 !important;
          }
        }
      `}</style>
    </div>
  );
}
