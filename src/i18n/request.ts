import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  const commonMessages = (await import(`../locales/${locale}/common.json`)).default;
  const supervisorMessages = (await import(`../locales/${locale}/supervisor.json`)).default;
  const managerMessages = (await import(`../locales/${locale}/manager.json`)).default;
  const rolesMessages = (await import(`../locales/${locale}/roles.json`)).default;
  const staffMessages = (await import(`../locales/${locale}/staff.json`)).default;
  const tablesMessages = (await import(`../locales/${locale}/tables.json`)).default;
  const menuMessages = (await import(`../locales/${locale}/menu.json`)).default;
  const qrcodesMessages = (await import(`../locales/${locale}/qrcodes.json`)).default;
  const promotionsMessages = (await import(`../locales/${locale}/promotions.json`)).default;
  const reportsMessages = (await import(`../locales/${locale}/reports.json`)).default;
  const auditMessages = (await import(`../locales/${locale}/audit.json`)).default;
  const servicesMessages = (await import(`../locales/${locale}/services.json`)).default;
  const loyaltyMessages = (await import(`../locales/${locale}/loyalty.json`)).default;
  const cartMessages = (await import(`../locales/${locale}/cart.json`)).default;
  const paymentsMessages = (await import(`../locales/${locale}/payments.json`)).default;

  return {
    locale,
    messages: {
      ...commonMessages,
      supervisor: supervisorMessages,
      manager: managerMessages,
      roles: rolesMessages,
      staff: staffMessages,
      tables: tablesMessages,
      menu: menuMessages,
      qrcodes: qrcodesMessages,
      promotions: promotionsMessages,
      reports: reportsMessages,
      audit: auditMessages,
      services: servicesMessages,
      loyalty: loyaltyMessages,
      cart: cartMessages,
      payments: paymentsMessages
    }
  };
});
