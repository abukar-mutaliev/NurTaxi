import { PlaceholderScreen } from '@/shared/ui';

/** Поиск и выбор адреса подачи/назначения. */
export default function AddressSearchRoute() {
  return (
    <PlaceholderScreen
      description="Поле поиска с debounce, подсказки с учётом адресации Северного Кавказа, выбор точки на карте, быстрый выбор любимых адресов."
      endpoints={['GET /geo/search', 'GET /me/addresses', 'POST /me/addresses']}
      task="M3.4 – M3.7"
      title="Куда едем?"
    />
  );
}
