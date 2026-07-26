/** Экстренные контакты — `/me/emergency-contacts` (M2.4, `§8.7`). Серверный лимит — 5. */
import { baseApi } from '@nurtaxi/shared-core/shared/api';
import type {
  CreateEmergencyContactPayload,
  EmergencyContact,
  SuccessResponse,
} from '@nurtaxi/shared-core/shared/model';

export const EMERGENCY_CONTACTS_LIMIT = 5;

export const emergencyContactApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getEmergencyContacts: build.query<EmergencyContact[], void>({
      query: () => '/me/emergency-contacts',
      providesTags: ['EmergencyContact'],
    }),

    createEmergencyContact: build.mutation<EmergencyContact, CreateEmergencyContactPayload>({
      query: (body) => ({ url: '/me/emergency-contacts', method: 'POST', body }),
      invalidatesTags: ['EmergencyContact'],
    }),

    deleteEmergencyContact: build.mutation<SuccessResponse, string>({
      query: (id) => ({ url: `/me/emergency-contacts/${id}`, method: 'DELETE' }),
      invalidatesTags: ['EmergencyContact'],
    }),
  }),
});

export const {
  useGetEmergencyContactsQuery,
  useCreateEmergencyContactMutation,
  useDeleteEmergencyContactMutation,
} = emergencyContactApi;
