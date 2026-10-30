import { currentAlert, dismissAlert, showAlert, subscribeAlerts } from './alert-store';

describe('alert-store', () => {
  afterEach(() => {
    for (let alert = currentAlert(); alert; alert = currentAlert()) {
      dismissAlert(alert.id);
    }
  });

  it('показывает диалоги по очереди, не накладывая их', () => {
    showAlert('Заказ отменён', 'Клиент отменил заказ.');
    showAlert('Второй');

    expect(currentAlert()?.title).toBe('Заказ отменён');
    dismissAlert(currentAlert()!.id);
    expect(currentAlert()?.title).toBe('Второй');
    dismissAlert(currentAlert()!.id);
    expect(currentAlert()).toBeNull();
  });

  it('сообщает подписчикам о каждом изменении', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeAlerts(listener);

    showAlert('Связаться с пассажиром', 'Номер телефона сейчас недоступен');
    dismissAlert(currentAlert()!.id);
    unsubscribe();
    showAlert('После отписки');

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('хранит кнопки и опции как есть', () => {
    const onPress = jest.fn();
    showAlert(
      'Связаться с водителем',
      '+7 (918) 817-44-12',
      [
        { style: 'cancel', text: 'Отмена' },
        { onPress, text: 'Позвонить' },
      ],
      { cancelable: true },
    );

    const alert = currentAlert();
    expect(alert?.buttons.map((button) => button.text)).toEqual(['Отмена', 'Позвонить']);
    expect(alert?.options.cancelable).toBe(true);
  });
});
