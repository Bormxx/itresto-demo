type Messages = typeof import('./locales/ru/common.json');

declare global {
  // Use type safe message keys with `next-intl`
  interface IntlMessages extends Messages {}
}
