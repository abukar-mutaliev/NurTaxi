/**
 * Английский словарь. Заполнен частично: интерфейс i18n-ready, недостающие ключи
 * автоматически берутся из `ru` (fallbackLng). Добавление новых языков (ing, ce) —
 * пострелизная задача `mob.tasks.md` P2.
 */
import type { TranslationResources } from './ru';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export const en: DeepPartial<TranslationResources> = {
  common: {
    ok: 'OK',
    cancel: 'Cancel',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    retry: 'Retry',
    loading: 'Loading…',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
    search: 'Search',
    notSpecified: 'Not specified',
    offline: 'No connection',
    reconnecting: 'Reconnecting…',
  },
  errors: {
    title: 'Something went wrong',
    generic: 'Request failed. Please try again.',
    NETWORK_ERROR: 'No connection to the server.',
    TIMEOUT: 'The server is not responding.',
    UNAUTHORIZED: 'Session expired. Please sign in again.',
    FORBIDDEN: 'You do not have permission for this action.',
    NOT_FOUND: 'Not found.',
    TOO_MANY_REQUESTS: 'Too many attempts. Please wait.',
    VALIDATION_ERROR: 'Please check the form fields.',
    INTERNAL_ERROR: 'Server error. We are on it.',
  },
  auth: {
    phoneTitle: 'Enter your phone number',
    phoneSubtitle: 'We will send an SMS with a confirmation code',
    phoneLabel: 'Phone number',
    getCode: 'Get code',
    codeTitle: 'Enter the code from SMS',
    codeSubtitle: 'Code sent to {{phone}}',
    codeLabel: 'Confirmation code',
    resend: 'Resend code',
    resendIn: 'Resend in {{time}}',
    changeNumber: 'Change number',
    logout: 'Sign out',
  },
  orderStatus: {
    created: 'Created',
    searching_driver: 'Searching for a driver',
    driver_assigned: 'Driver assigned',
    driver_en_route: 'Driver on the way',
    driver_arrived: 'Driver has arrived',
    in_progress: 'On the trip',
    completed: 'Completed',
    closed: 'Closed',
    cancelled_by_client: 'Cancelled by client',
    cancelled_by_driver: 'Cancelled by driver',
    cancelled_system: 'Cancelled by system',
    failed_payment: 'Payment failed',
  },
};
