export type { DriverProfile, DriverDocument, Vehicle, ModerateDocumentDto, UpdateDriverDto } from './model/types';
export {
  driverApi,
  useListDriversQuery,
  useGetDriverQuery,
  useModerateDocumentMutation,
  useBlockDriverMutation,
  useUpdateDriverMutation,
  useApproveDriverMutation,
  useDeleteDriverMutation,
} from './api/driver-api';
