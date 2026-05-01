import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import AuditLogsClient from '@/components/supervisor/AuditLogsClient';
import LoadingState from '@/components/ui/LoadingState';

export async function generateMetadata() {
  const t = await getTranslations('supervisor');
  return {
    title: 'Журнал аудита',
  };
}

export default function AuditLogsPage() {
  return (
    <div className="p-6">
      <Suspense fallback={<LoadingState message="Загрузка журнала аудита..." />}>
        <AuditLogsClient />
      </Suspense>
    </div>
  );
}
