import { NO_STOPS_PASSED, advanceStopProgress, type StopProgress } from './stop-progress';

const STOP = { lat: 43.2, lng: 44.8 };
const SECOND_STOP = { lat: 43.25, lng: 44.85 };

/** Точка на `meters` севернее остановки (1° широты ≈ 111,2 км). */
function northOf(point: { lat: number; lng: number }, meters: number) {
  return { lat: point.lat + meters / 111_195, lng: point.lng };
}

/** Прогоняет машину по списку расстояний до остановки. */
function drive(distances: number[], stops = [STOP]): StopProgress {
  return distances.reduce<StopProgress>(
    (progress, meters) => advanceStopProgress(progress, northOf(STOP, meters), stops),
    NO_STOPS_PASSED,
  );
}

describe('advanceStopProgress', () => {
  it('не трогает прогресс, пока машина далеко', () => {
    const progress = advanceStopProgress(NO_STOPS_PASSED, northOf(STOP, 800), [STOP]);

    expect(progress).toBe(NO_STOPS_PASSED);
  });

  it('не снимает остановку за 150 метров до неё — водитель ещё не доехал', () => {
    expect(drive([400, 140, 100, 60]).count).toBe(0);
  });

  it('снимает остановку, когда машина подъехала вплотную', () => {
    expect(drive([400, 140, 80, 30]).count).toBe(1);
  });

  it('снимает остановку, когда машина была рядом и поехала дальше', () => {
    // Адрес — дом в стороне от дороги: ближе 60 м подъехать нельзя.
    expect(drive([300, 120, 70, 60, 75, 115]).count).toBe(1);
  });

  it('пока машина стоит у остановки, цель не меняется', () => {
    // Дрожание GPS на месте — в пределах десятка метров.
    expect(drive([120, 62, 60, 68, 61, 70]).count).toBe(0);
  });

  it('снимает остановку, если следующая точка пришла уже издалека', () => {
    // Приложение клиента было свёрнуто, пока машина проезжала мимо.
    expect(drive([130, 900]).count).toBe(1);
  });

  it('начинает отсчёт для следующей остановки заново', () => {
    const afterFirst = drive([120, 30], [STOP, SECOND_STOP]);

    expect(afterFirst).toEqual({ closestM: null, count: 1 });
    expect(advanceStopProgress(afterFirst, northOf(STOP, 30), [STOP, SECOND_STOP])).toBe(
      afterFirst,
    );
  });

  it('возвращает тот же объект, если машина не стала ближе', () => {
    const near = advanceStopProgress(NO_STOPS_PASSED, northOf(STOP, 100), [STOP]);

    expect(advanceStopProgress(near, northOf(STOP, 110), [STOP])).toBe(near);
  });

  it('без остановок ничего не делает', () => {
    expect(advanceStopProgress(NO_STOPS_PASSED, STOP, [])).toBe(NO_STOPS_PASSED);
  });
});
