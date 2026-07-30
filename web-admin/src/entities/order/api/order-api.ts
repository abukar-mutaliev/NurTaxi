import { baseApi } from '@/shared/api';
import { API_TAGS } from '@/shared/api/tags';
import type { OrderStatus } from '@/shared/model/enums';
import type {
  AdminAssignDriverDto,
  AdminOrderStatusDto,
  AdminRefundDto,
  NearbyDriver,
  Order,
  OrderListPage,
  OrderStatusLogEntry,
} from '../model/types';

export const orderApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listOrders: build.query<
      OrderListPage,
      { regionId?: string; status?: OrderStatus; limit?: number; cursor?: string }
    >({
      query: (params) => ({
        url: '/admin/orders',
        params,
      }),
      providesTags: [API_TAGS.Order],
    }),
    getOrder: build.query<Order, string>({
      query: (id) => `/admin/orders/${id}`,
      providesTags: (_r, _e, id) => [{ type: API_TAGS.Order, id }],
    }),
    getOrderStatusLogs: build.query<OrderStatusLogEntry[], string>({
      query: (id) => `/admin/orders/${id}/status-logs`,
      providesTags: (_r, _e, id) => [{ type: API_TAGS.Order, id: `logs-${id}` }],
    }),
    getNearbyDrivers: build.query<NearbyDriver[], string>({
      query: (id) => `/admin/orders/${id}/nearby-drivers`,
    }),
    assignDriver: build.mutation<Order, { id: string; body: AdminAssignDriverDto }>({
      query: ({ id, body }) => ({
        url: `/admin/orders/${id}/assign`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [API_TAGS.Order],
    }),
    changeStatus: build.mutation<Order, { id: string; body: AdminOrderStatusDto }>({
      query: ({ id, body }) => ({
        url: `/admin/orders/${id}/status`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [API_TAGS.Order],
    }),
    refundOrder: build.mutation<{ success: boolean; orderId: string }, { id: string; body: AdminRefundDto }>({
      query: ({ id, body }) => ({
        url: `/admin/orders/${id}/refund`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [API_TAGS.Order],
    }),
  }),
});

export const {
  useListOrdersQuery,
  useLazyListOrdersQuery,
  useGetOrderQuery,
  useGetOrderStatusLogsQuery,
  useGetNearbyDriversQuery,
  useAssignDriverMutation,
  useChangeStatusMutation,
  useRefundOrderMutation,
} = orderApi;
