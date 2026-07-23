/** E2E-тесты требуют PostgreSQL и Redis (см. .github/workflows/ci.yml). */
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
