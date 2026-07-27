/**
 * Обновление и удаление избранного адреса (M3.6).
 */
import { useCallback } from 'react';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import type { UpdateSavedAddressPayload } from '@nurtaxi/shared-core/shared/model';
import {
  useDeleteSavedAddressMutation,
  useUpdateSavedAddressMutation,
} from '@nurtaxi/shared-core/entities/saved-address';

export function useSavedAddressUpdate() {
  const [updateSavedAddress, updateState] = useUpdateSavedAddressMutation();
  const [deleteSavedAddress, deleteState] = useDeleteSavedAddressMutation();

  const updateAddress = useCallback(
    async (id: string, body: UpdateSavedAddressPayload) => {
      return updateSavedAddress({ id, body }).unwrap();
    },
    [updateSavedAddress],
  );

  const removeAddress = useCallback(
    async (id: string) => {
      return deleteSavedAddress(id).unwrap();
    },
    [deleteSavedAddress],
  );

  return {
    updateAddress,
    removeAddress,
    isUpdating: updateState.isLoading,
    isDeleting: deleteState.isLoading,
    updateError: updateState.error ? toAppError(updateState.error) : null,
    deleteError: deleteState.error ? toAppError(deleteState.error) : null,
  };
}
