import { test, expect, type Page } from '@playwright/test';

const superAdminUser = {
  id: 'u1',
  phone: '+79000000001',
  name: 'Super Admin',
  photoUrl: null,
  role: 'super_admin',
  language: 'ru',
  status: 'active',
  assignedRegionId: null,
  pdnConsentGiven: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const operatorUser = {
  ...superAdminUser,
  id: 'u3',
  phone: '+79000000003',
  name: 'Operator',
  role: 'operator',
  assignedRegionId: 'region-1',
};

async function mockAuth(page: Page, user: typeof superAdminUser) {
  await page.route('**/api/v1/auth/otp/request', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ expiresInSec: 300, resendAfterSec: 60, devCode: '1234' }),
    });
  });

  await page.route('**/api/v1/auth/otp/verify', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresInSec: 3600,
        user,
        isNewUser: false,
        requiresConsent: false,
      }),
    });
  });

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user),
    });
  });
}

async function login(page: Page, phone: string) {
  await page.goto('/login');
  await page.getByPlaceholder('+7 (900) 000-00-00').fill(phone);
  await page.getByRole('button', { name: 'Получить код' }).click();
  await page.locator('.ant-otp-input').first().fill('1');
  await page.locator('.ant-otp-input').nth(1).fill('2');
  await page.locator('.ant-otp-input').nth(2).fill('3');
  await page.locator('.ant-otp-input').nth(3).fill('4');
  await page.getByRole('button', { name: 'Войти' }).click();
}

async function mockAnalytics(page: Page) {
  await page.route('**/api/v1/admin/analytics**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        orders: { total: 0, active: 0, completed: 0, cancelled: 0 },
        drivers: { total: 0, online: 0, pending: 0 },
        payments: { totalAmount: 0, succeededCount: 0, failedCount: 0 },
        timeseries: [],
        kpi: null,
      }),
    });
  });
}

test.describe('Login', () => {
  test('super admin reaches dashboard', async ({ page }) => {
    await mockAuth(page, superAdminUser);
    await mockAnalytics(page);
    await login(page, '9000000001');
    await expect(page.getByRole('menuitem', { name: 'Дашборд' })).toBeVisible();
  });
});

test.describe('UC-5 Regions', () => {
  test('super admin sees regions list', async ({ page }) => {
    await mockAuth(page, superAdminUser);
    await page.route('**/api/v1/admin/regions**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'region-1',
            name: 'Ингушетия',
            timezone: 'Europe/Moscow',
            currency: 'RUB',
            isActive: true,
            featureFlags: {},
          },
        ]),
      });
    });
    await mockAnalytics(page);
    await login(page, '9000000001');
    await page.getByRole('menuitem', { name: 'Регионы' }).click();
    await expect(page.getByText('Ингушетия')).toBeVisible();
  });
});

test.describe('Driver verification', () => {
  test('operator opens drivers queue', async ({ page }) => {
    await mockAuth(page, operatorUser);
    await page.route('**/api/v1/admin/regions/region-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'region-1',
          name: 'Ингушетия',
          timezone: 'Europe/Moscow',
          currency: 'RUB',
          isActive: true,
          featureFlags: {},
        }),
      });
    });
    await page.route('**/api/v1/admin/drivers**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'driver-1',
            fullName: 'Аmina Test',
            phone: '+79001112233',
            regionId: 'region-1',
            verificationStatus: 'pending',
            rating: 5,
            experienceYears: 3,
            documents: [],
            vehicles: [],
          },
        ]),
      });
    });
    await page.route('**/api/v1/admin/analytics**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orders: { total: 0, active: 0, completed: 0, cancelled: 0 },
          drivers: { total: 1, online: 0, pending: 1 },
          payments: { totalAmount: 0, succeededCount: 0, failedCount: 0 },
          timeseries: [],
          kpi: null,
        }),
      });
    });

    await login(page, '9000000003');
    await page.getByRole('menuitem', { name: 'Водители' }).click();
    await expect(page.getByText('Аmina Test')).toBeVisible();
  });
});

test.describe('Orders console', () => {
  test('operator sees orders list', async ({ page }) => {
    await mockAuth(page, operatorUser);
    await page.route('**/api/v1/admin/regions/region-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'region-1',
          name: 'Ингушетия',
          timezone: 'Europe/Moscow',
          currency: 'RUB',
          isActive: true,
          featureFlags: {},
        }),
      });
    });
    await page.route('**/api/v1/admin/orders**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'order-abc-123',
              status: 'searching',
              regionId: 'region-1',
              pickupAddress: 'ул. Ленина, 1',
              pickupLat: 43.1,
              pickupLng: 44.8,
              dropoffAddress: 'ул. Кирова, 5',
              dropoffLat: 43.2,
              dropoffLng: 44.9,
              priceEstimated: 350,
              priceFinal: null,
              cancellationFee: null,
              paymentMethod: 'card',
              comment: null,
              route: null,
              driver: null,
              createdAt: '2026-01-01T12:00:00.000Z',
            },
          ],
          nextCursor: null,
          hasMore: false,
        }),
      });
    });
    await page.route('**/api/v1/admin/analytics**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orders: { total: 1, active: 1, completed: 0, cancelled: 0 },
          drivers: { total: 0, online: 0, pending: 0 },
          payments: { totalAmount: 0, succeededCount: 0, failedCount: 0 },
          timeseries: [],
          kpi: null,
        }),
      });
    });

    await login(page, '9000000003');
    await page.getByRole('menuitem', { name: 'Заказы' }).click();
    await expect(page.getByText('ул. Ленина, 1')).toBeVisible();
  });
});
