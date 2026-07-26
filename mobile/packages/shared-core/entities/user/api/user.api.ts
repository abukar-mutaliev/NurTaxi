/** Профиль пользователя — `GET/PATCH /me`, `POST /me/consent` (M2.1, `§8.3`). */
import { baseApi } from '@nurtaxi/shared-core/shared/api';
import type {
  ConsentPayload,
  UpdateProfilePayload,
  UserProfile,
} from '@nurtaxi/shared-core/shared/model';

export const userApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query<UserProfile, void>({
      query: () => '/me',
      providesTags: ['Profile'],
    }),

    updateMe: build.mutation<UserProfile, UpdateProfilePayload>({
      query: (body) => ({ url: '/me', method: 'PATCH', body }),
      invalidatesTags: ['Profile'],
      // Профиль небольшой — оптимистично обновляем кэш, чтобы UI не «прыгал».
      async onQueryStarted(patch, { dispatch, queryFulfilled }) {
        const undo = dispatch(
          userApi.util.updateQueryData('getMe', undefined, (draft) => {
            Object.assign(draft, patch);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          undo.undo();
        }
      },
    }),

    /** Согласие на обработку персональных данных, 152-ФЗ (`§8.1`). */
    giveConsent: build.mutation<UserProfile, ConsentPayload>({
      query: (body) => ({ url: '/me/consent', method: 'POST', body }),
      invalidatesTags: ['Profile'],
    }),
  }),
});

export const { useGetMeQuery, useLazyGetMeQuery, useUpdateMeMutation, useGiveConsentMutation } =
  userApi;
