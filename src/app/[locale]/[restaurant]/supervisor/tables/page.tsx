'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import DataTable from '@/components/supervisor/DataTable';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import IconButton from '@/components/ui/IconButton';
import QRCode from 'qrcode';

interface Table {
  id: string;
  number: string;
  description: string | null;
  qrCode: string | null;
  status: string;
  capacity: number;
  createdAt: string;
}

const initialFormData = {
  number: '',
  description: '',
  capacity: 4,
  pin: '',
};

export default function TablesPage() {
  const t = useTranslations('tables');
  const params = useParams();
  const restaurant = params.restaurant as string;
  
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedQrCode, setSelectedQrCode] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/supervisor/tables');
      if (res.ok) {
        const data = await res.json();
        // Сортируем столики по номеру как числа, а не как строки
        const sortedData = data.sort((a: Table, b: Table) => {
          const numA = parseInt(a.number, 10);
          const numB = parseInt(b.number, 10);
          // Если оба номера - валидные числа, сортируем как числа
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          // Иначе сортируем как строки
          return a.number.localeCompare(b.number);
        });
        
        // Генерируем QR-коды для всех столиков
        const baseUrl = typeof window !== 'undefined' 
          ? window.location.origin 
          : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        const tablesWithQR = await Promise.all(
          sortedData.map(async (table: Table) => {
            const url = `${baseUrl}/${restaurant}?table=${table.number}`;
            
            try {
              const qrCodeDataUrl = await QRCode.toDataURL(url, {
                width: 300,
                margin: 2,
                color: {
                  dark: '#000000',
                  light: '#FFFFFF',
                },
              });
              
              return {
                ...table,
                qrCode: qrCodeDataUrl,
              };
            } catch (error) {
              console.error('Error generating QR code for table:', table.number, error);
              return table;
            }
          })
        );
        
        setTables(tablesWithQR);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingTable(null);
    setFormData({ ...initialFormData });
    setModalOpen(true);
  };

  const handleEdit = () => {
    if (selectedTables.length !== 1) {
      alert(t('selectOne'));
      return;
    }
    
    const table = tables.find((t) => t.id === selectedTables[0]);
    if (table) {
      setEditingTable(table);
      setFormData({
        number: table.number || '',
        description: table.description || '',
        capacity: table.capacity || 4,
        pin: '',
      });
      setModalOpen(true);
    }
  };

  const handleDelete = async () => {
    if (selectedTables.length === 0) return;
    if (!confirm(`${t('confirmDelete')} ${selectedTables.length}`)) return;

    try {
      await Promise.all(
        selectedTables.map((id) =>
          fetch(`/api/supervisor/tables?id=${id}`, { method: 'DELETE' })
        )
      );
      setSelectedTables([]);
      fetchTables();
    } catch (error) {
      console.error('Error deleting tables:', error);
      alert(t('errorDeleting'));
    }
  };

  const handleSave = async () => {
    if (!formData.number) {
      alert(t('fillNumber'));
      return;
    }

    try {
      const method = editingTable ? 'PATCH' : 'POST';
      const body: any = { ...formData };

      if (editingTable) {
        body.id = editingTable.id;
      }

      const res = await fetch('/api/supervisor/tables', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error('Server error response:', error);
        alert(`Ошибка: ${error.error || 'Failed to save table'}`);
        return;
      }

      setModalOpen(false);
      fetchTables();
    } catch (error: any) {
      console.error('Error saving table:', error);
      alert(error.message || t('errorSaving'));
    }
  };

  const handleShowQr = (table: Table) => {
    if (table.qrCode) {
      setSelectedQrCode(table.qrCode);
      setQrModalOpen(true);
    }
  };

  const handlePrintQr = () => {
    if (selectedQrCode) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>QR Code</title>
              <style>
                body { 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 100vh; 
                  margin: 0; 
                }
                img { 
                  max-width: 400px; 
                  max-height: 400px; 
                }
              </style>
            </head>
            <body>
              <img src="${selectedQrCode}" alt="QR Code" />
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">{t('loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <div className="flex gap-2">
          <Button 
            variant="secondary"
            onClick={() => router.push(`/${locale}/${restaurant}/supervisor/qr-codes`)}
          >
            QR-коды
          </Button>
          <IconButton
            icon="plus"
            variant="primary"
            size="lg"
            onClick={handleAdd}
            title={t('addTable')}
          />
          <IconButton
            icon="edit"
            variant="primary"
            size="lg"
            onClick={handleEdit}
            disabled={selectedTables.length !== 1}
            title={t('editTable')}
          />
          <IconButton
            icon="delete"
            variant="danger"
            size="lg"
            onClick={handleDelete}
            disabled={selectedTables.length === 0}
            title={`${t('deleteTable')} (${selectedTables.length})`}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <DataTable
          data={tables}
          columns={[
            { key: 'number', label: t('tableNumber') },
            { 
              key: 'description', 
              label: t('description'),
              render: (table) => table.description || '—',
            },
            { 
              key: 'capacity', 
              label: t('capacity'),
              render: (table) => `${table.capacity} ${t('people')}`,
            },
            {
              key: 'status',
              label: t('status'),
              render: (table) => {
                const statusColors = {
                  available: 'bg-green-100 text-green-800',
                  occupied: 'bg-red-100 text-red-800',
                  reserved: 'bg-yellow-100 text-yellow-800',
                };
                const statusLabels = {
                  available: t('statusAvailable'),
                  occupied: t('statusOccupied'),
                  reserved: t('statusReserved'),
                };
                return (
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      statusColors[table.status as keyof typeof statusColors]
                    }`}
                  >
                    {statusLabels[table.status as keyof typeof statusLabels]}
                  </span>
                );
              },
            },
            {
              key: 'qrCode',
              label: t('qrCode'),
              render: (table) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShowQr(table);
                  }}
                  className="text-blue-600 hover:text-blue-800 underline"
                  disabled={!table.qrCode}
                >
                  {table.qrCode ? t('show') : t('no')}
                </button>
              ),
            },
          ]}
          selectedIds={selectedTables}
          onSelectionChange={setSelectedTables}
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTable ? t('editTable') : t('addTable')}
      >
        <div className="space-y-4">
          <Input
            label="Номер столика"
            required
            value={formData.number}
            onChange={(e) => setFormData({ ...formData, number: e.target.value })}
            placeholder="Например: 1, A1, VIP-1"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Например: У окна, На веранде, VIP-зона"
            />
          </div>

          <Input
            label="Вместимость (человек)"
            type="number"
            min="1"
            max="20"
            value={formData.capacity.toString()}
            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 4 })}
          />

          <Input
            label="PIN-код (опционально)"
            type="text"
            maxLength={4}
            value={formData.pin}
            onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
            placeholder="4 цифры"
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave}>
              {editingTable ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="QR-код столика"
      >
        <div className="space-y-4">
          {selectedQrCode && (
            <div className="flex flex-col items-center">
              <img
                src={selectedQrCode}
                alt="QR Code"
                className="max-w-full h-auto border border-gray-200 rounded-lg"
              />
              <p className="mt-4 text-sm text-gray-600 text-center">
                Отсканируйте QR-код для доступа к меню
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setQrModalOpen(false)}>
              Закрыть
            </Button>
            <Button onClick={handlePrintQr}>
              Печать
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
