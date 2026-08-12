/**
 * Водитель — `/driver/*` (M7–M9, `§8.2`, `§8.4`, `§12.3`).
 *
 * Загрузка документов идёт в два шага: `presign` выдаёт подписанный URL приватного S3,
 * файл уходит напрямую в хранилище (минуя API), после чего `registerDocument` привязывает
 * `storageKey` к профилю. См. `uploadDriverDocument` в `features/driver-documents`.
 */
import { baseApi } from '@nurtaxi/shared-core/shared/api';
import type {
  CancelOrderPayload,
  CreateReviewPayload,
  DriverDocument,
  DriverEarnings,
  DriverOrderActionPayload,
  DriverOrderOffer,
  DriverProfile,
  LimitQuery,
  Order,
  OrderHistoryItem,
  PresignDocumentPayload,
  PresignDocumentResponse,
  RegisterDocumentPayload,
  RegisterDriverPayload,
  Review,
  SuccessResponse,
  UpdateDriverLocationPayload,
  UpdateDriverStatusPayload,
  UpdateWorkSchedulePayload,
} from '@nurtaxi/shared-core/shared/model';

export const driverApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // --- Регистрация и верификация (M7) ---------------------------------------------------
    registerDriver: build.mutation<DriverProfile, RegisterDriverPayload>({
      query: (body) => ({ url: '/driver/register', method: 'POST', body }),
      invalidatesTags: ['DriverProfile'],
    }),

    getDriverProfile: build.query<DriverProfile, void>({
      query: () => '/driver/profile',
      providesTags: ['DriverProfile'],
    }),

    presignDriverDocument: build.mutation<PresignDocumentResponse, PresignDocumentPayload>({
      query: (body) => ({ url: '/driver/documents/presign', method: 'POST', body }),
    }),

    registerDriverDocument: build.mutation<DriverDocument, RegisterDocumentPayload>({
      query: (body) => ({ url: '/driver/documents', method: 'POST', body }),
      invalidatesTags: ['DriverProfile'],
    }),

    /** Отправляет анкету и документы на ручную модерацию (`§8.2`). */
    submitDriverDocuments: build.mutation<DriverProfile, void>({
      query: () => ({ url: '/driver/documents/submit', method: 'POST' }),
      invalidatesTags: ['DriverProfile'],
    }),

    // --- Линия и геопозиция (M8) ----------------------------------------------------------
    updateDriverStatus: build.mutation<DriverProfile, UpdateDriverStatusPayload>({
      query: (body) => ({ url: '/driver/status', method: 'PATCH', body }),
      invalidatesTags: ['DriverProfile'],
    }),

    updateWorkSchedule: build.mutation<DriverProfile, UpdateWorkSchedulePayload>({
      query: (body) => ({ url: '/driver/work-schedule', method: 'PATCH', body }),
      invalidatesTags: ['DriverProfile'],
    }),

    /**
     * HTTP-фоллбэк для передачи позиции. Основной канал — событие `driver.location` по
     * WebSocket; REST используется, когда сокет не подключён (`M8.2`).
     */
    updateDriverLocation: build.mutation<SuccessResponse, UpdateDriverLocationPayload>({
      query: (body) => ({ url: '/driver/location', method: 'PATCH', body }),
    }),

    // --- Заказы водителя (M8) -------------------------------------------------------------
    /**
     * Предложение, ожидающее ответа водителя (`§15.3`).
     *
     * Событие `order.offer` по сокету приходит один раз и только в моменте. Свёрнутое
     * приложение на Android теряет сокет за считаные секунды — заказ пропадает молча.
     * Поэтому вернувшись на передний план, приложение спрашивает сервер само.
     * `null` — ждать нечего.
     */
    getPendingOffer: build.query<DriverOrderOffer | null, void>({
      query: () => ({ url: '/driver/orders/offer' }),
    }),

    /**
     * История поездок водителя (`§8.13`). Отдельная от `/orders/history`: та закрыта ролью
     * Client и вернула бы водителю 403.
     */
    getDriverOrderHistory: build.query<OrderHistoryItem[], LimitQuery | void>({
      query: (params) => ({ url: '/driver/orders/history', params: params ?? undefined }),
      providesTags: ['OrderHistory'],
    }),

    acceptDriverOrder: build.mutation<Order, string>({
      query: (orderId) => ({ url: `/driver/orders/${orderId}/accept`, method: 'POST' }),
      invalidatesTags: (_result, _error, orderId) => [{ type: 'Order', id: orderId }],
    }),

    updateDriverOrderStatus: build.mutation<Order, { orderId: string } & DriverOrderActionPayload>({
      query: ({ orderId, ...body }) => ({
        url: `/driver/orders/${orderId}/status`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { orderId }) => [{ type: 'Order', id: orderId }],
    }),

    cancelDriverOrder: build.mutation<Order, { orderId: string } & CancelOrderPayload>({
      query: ({ orderId, ...body }) => ({
        url: `/driver/orders/${orderId}/cancel`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { orderId }) => [{ type: 'Order', id: orderId }],
    }),

    /** Оценка клиента после поездки (`M8.8`, `§8.14`). */
    reviewClient: build.mutation<Review, { orderId: string } & CreateReviewPayload>({
      query: ({ orderId, ...body }) => ({
        url: `/driver/orders/${orderId}/review`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Review'],
    }),

    // --- Доходы (M9) ----------------------------------------------------------------------
    getDriverEarnings: build.query<DriverEarnings, void>({
      query: () => '/driver/earnings',
      providesTags: ['DriverEarnings'],
    }),
  }),
});

export const {
  useRegisterDriverMutation,
  useGetDriverProfileQuery,
  useLazyGetDriverProfileQuery,
  usePresignDriverDocumentMutation,
  useRegisterDriverDocumentMutation,
  useSubmitDriverDocumentsMutation,
  useUpdateDriverStatusMutation,
  useUpdateWorkScheduleMutation,
  useUpdateDriverLocationMutation,
  useGetDriverOrderHistoryQuery,
  useLazyGetPendingOfferQuery,
  useAcceptDriverOrderMutation,
  useUpdateDriverOrderStatusMutation,
  useCancelDriverOrderMutation,
  useReviewClientMutation,
  useGetDriverEarningsQuery,
} = driverApi;
