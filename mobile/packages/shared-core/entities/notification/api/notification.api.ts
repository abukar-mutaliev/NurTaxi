/** Центр уведомлений — `/me/notifications` (M10.3, `§23`). */
import { baseApi } from '@nurtaxi/shared-core/shared/api';
import type {
  AppNotification,
  LimitQuery,
  RegisterPushTokenPayload,
  SuccessResponse,
  UnreadCountResponse,
  UnregisterPushTokenPayload,
} from '@nurtaxi/shared-core/shared/model';

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<AppNotification[], LimitQuery | void>({
      query: (params) => ({ url: '/me/notifications', params: params ?? undefined }),
      providesTags: ['Notification'],
    }),

    getUnreadCount: build.query<UnreadCountResponse, void>({
      query: () => '/me/notifications/unread-count',
      providesTags: ['Notification'],
    }),

    markNotificationRead: build.mutation<AppNotification, string>({
      query: (id) => ({ url: `/me/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),

    markAllNotificationsRead: build.mutation<SuccessResponse, void>({
      query: () => ({ url: '/me/notifications/read-all', method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),

    registerPushToken: build.mutation<SuccessResponse, RegisterPushTokenPayload>({
      query: (body) => ({ url: '/me/push-tokens', method: 'POST', body }),
    }),

    unregisterPushToken: build.mutation<SuccessResponse, UnregisterPushTokenPayload>({
      query: (body) => ({ url: '/me/push-tokens', method: 'DELETE', body }),
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useRegisterPushTokenMutation,
  useUnregisterPushTokenMutation,
} = notificationApi;
