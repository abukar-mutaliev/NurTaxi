/** Профиль пользователя — `GET/PATCH /me`, `POST /me/consent` (M2.1, `§8.3`). */
import { baseApi } from '@nurtaxi/shared-core/shared/api';
import type {
  ConfirmProfilePhotoPayload,
  ConsentPayload,
  PresignProfilePhotoPayload,
  PresignProfilePhotoResponse,
  UpdateProfilePayload,
  UserProfile,
} from '@nurtaxi/shared-core/shared/model';

function applyProfilePatch(draft: UserProfile, patch: UpdateProfilePayload): void {
  if (patch.notificationSettings) {
    draft.notificationSettings = {
      ...draft.notificationSettings,
      ...patch.notificationSettings,
    };
  }
  if (patch.privacySettings) {
    draft.privacySettings = {
      ...draft.privacySettings,
      ...patch.privacySettings,
    };
  }
  if (patch.name !== undefined) draft.name = patch.name;
  if (patch.photoUrl !== undefined) draft.photoUrl = patch.photoUrl;
  if (patch.language !== undefined) draft.language = patch.language;
}

export const userApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query<UserProfile, void>({
      query: () => '/me',
      providesTags: ['Profile'],
    }),

    updateMe: build.mutation<UserProfile, UpdateProfilePayload>({
      query: (body) => ({ url: '/me', method: 'PATCH', body }),
      // Профиль небольшой — оптимистично обновляем кэш, чтобы UI не «прыгал».
      async onQueryStarted(patch, { dispatch, queryFulfilled }) {
        const undo = dispatch(
          userApi.util.updateQueryData('getMe', undefined, (draft) => {
            applyProfilePatch(draft, patch);
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

    presignProfilePhoto: build.mutation<PresignProfilePhotoResponse, PresignProfilePhotoPayload>({
      query: (body) => ({ url: '/me/photo/presign', method: 'POST', body }),
    }),

    confirmProfilePhoto: build.mutation<UserProfile, ConfirmProfilePhotoPayload>({
      query: (body) => ({ url: '/me/photo/confirm', method: 'POST', body }),
      invalidatesTags: ['Profile'],
    }),
  }),
});

export const {
  useGetMeQuery,
  useLazyGetMeQuery,
  useUpdateMeMutation,
  useGiveConsentMutation,
  usePresignProfilePhotoMutation,
  useConfirmProfilePhotoMutation,
} = userApi;
