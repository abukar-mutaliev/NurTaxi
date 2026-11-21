# Реестр внешних обработчиков персональных данных (FZ-02.5)

| Сервис | Назначение | Состав данных | Юрисдикция | Переменная |
|--------|------------|---------------|------------|------------|
| PostgreSQL | Основное хранилище заказов и ПДн | Полный состав журнала | РФ (`ru-central-1`) | `DB_HOST` |
| Redis | Кэш, гео, сессии | Координаты водителей, offer TTL | РФ | `REDIS_HOST` |
| S3/MinIO | Документы, выгрузки | Сканы документов, CSV выгрузок | РФ, `S3_REGION=ru-central-1` | `S3_ENDPOINT` |
| NATS | Внутрисистемные события | Идентификаторы заказов | РФ | `NATS_URL` |
| Sentry | Ошибки (опционально) | Стек без ПДн (`beforeSend`) | Только РФ либо выключен | `SENTRY_ENABLED`, `SENTRY_DSN` |
| OpenTelemetry | Трейсы | SQL без параметров, HTTP без query | Коллектор в РФ | `OTEL_EXPORTER_OTLP_ENDPOINT` |
| Push (Expo → FCM) | Уведомления | Токен устройства, заголовок и текст шаблона без ФИО, телефона и адреса, eventId | США (Expo) → Google FCM. Свой шлюз: `PUSH_ENDPOINT` | `PUSH_TOKEN`, `EXPO_PUSH_URL`, `PUSH_ENDPOINT` |
| SMS-провайдер | OTP | Номер телефона | РФ, через ProviderConfig | `credentialsRef` |
| Карты (Яндекс) | Поиск адресов | Координаты/строка поиска | РФ | `YANDEX_*` |
| Реестр такси | Проверка разрешения | ИНН, номер разрешения, VIN | РФ (заглушка до B.3) | ProviderType `taxi_registry` |
| РИС субъекта | Передача сведений о поездке | Схема `risPayloadSchema` | РФ (заглушка до B.1) | `compliance_config.risTransferEnabled` |
