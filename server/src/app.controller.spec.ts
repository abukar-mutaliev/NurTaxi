import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: () => ({ name: 'nurtaxi-backend', env: 'test' }),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get<AppController>(AppController);
  });

  it('возвращает информацию о сервисе со статусом ok', () => {
    const info = controller.getServiceInfo();
    expect(info.status).toBe('ok');
    expect(info.service).toBe('nurtaxi-backend');
    expect(info.environment).toBe('test');
  });
});
