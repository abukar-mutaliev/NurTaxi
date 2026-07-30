export type {
  Region,
  City,
  CreateRegionDto,
  UpdateRegionDto,
  CreateCityDto,
  UpdateCityDto,
} from './model/types';
export {
  regionApi,
  useListRegionsQuery,
  useGetRegionQuery,
  useCreateRegionMutation,
  useUpdateRegionMutation,
  useListCitiesQuery,
  useCreateCityMutation,
  useUpdateCityMutation,
} from './api/region-api';
export { FEATURE_FLAGS, getFeatureFlagLabel, type FeatureFlag } from './lib/feature-flags';
