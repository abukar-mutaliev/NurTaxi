export type {
  Tariff,
  SurgeRules,
  CancellationPolicy,
  CreateTariffDto,
  UpdateTariffDto,
} from './model/types';
export {
  tariffApi,
  useListTariffsQuery,
  useCreateTariffMutation,
  useUpdateTariffMutation,
} from './api/tariff-api';
