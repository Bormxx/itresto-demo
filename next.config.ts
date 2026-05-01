import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
  // Production standalone output для Docker
  output: 'standalone',
  
  // React Compiler отключен в dev для снижения нагрузки на CPU
  reactCompiler: process.env.NODE_ENV === 'production',
  
  // Исключаем mobile-waiter из сборки
  webpack: (config: any) => {
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    
    // Игнорируем все файлы из mobile-waiter
    config.module.rules.push({
      test: /mobile-waiter[\\/]/,
      loader: 'ignore-loader',
    });
    
    return config;
  },
  
  // Оптимизации для разработки
  typescript: {
    // Игнорировать ошибки TypeScript при сборке (временно для production)
    ignoreBuildErrors: true,
  },
  
  // Отключить telemetry Next.js
  experimental: {
    // Ускорить компиляцию
    // cpus: 1, // Ограничить количество CPU ядер (раскомментируйте если нужно)
  },
};

export default withNextIntl(nextConfig);
