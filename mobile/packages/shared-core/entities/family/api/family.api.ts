/** Семейный аккаунт — `/me/family` (M10.4, `§8.6`). Доступен только роли `client`. */
import { baseApi } from '@nurtaxi/shared-core/shared/api';
import type {
  AddFamilyMemberPayload,
  ConfirmFamilyPayload,
  FamilyMember,
  SuccessResponse,
} from '@nurtaxi/shared-core/shared/model';

export const familyApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getFamilyMembers: build.query<FamilyMember[], void>({
      query: () => '/me/family',
      providesTags: ['FamilyMember'],
    }),

    addFamilyMember: build.mutation<FamilyMember, AddFamilyMemberPayload>({
      query: (body) => ({ url: '/me/family', method: 'POST', body }),
      invalidatesTags: ['FamilyMember'],
    }),

    confirmFamilyMember: build.mutation<FamilyMember, { id: string } & ConfirmFamilyPayload>({
      query: ({ id, ...body }) => ({ url: `/me/family/${id}/confirm`, method: 'POST', body }),
      invalidatesTags: ['FamilyMember'],
    }),

    removeFamilyMember: build.mutation<SuccessResponse, string>({
      query: (id) => ({ url: `/me/family/${id}`, method: 'DELETE' }),
      invalidatesTags: ['FamilyMember'],
    }),
  }),
});

export const {
  useGetFamilyMembersQuery,
  useAddFamilyMemberMutation,
  useConfirmFamilyMemberMutation,
  useRemoveFamilyMemberMutation,
} = familyApi;
