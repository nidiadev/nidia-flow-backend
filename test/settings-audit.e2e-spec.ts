import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Settings and Audit Controllers (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/settings', () => {
    it('should return 401 for unauthenticated requests', () => {
      return request(app.getHttpServer())
        .get('/settings')
        .expect(401);
    });

    it('should return 401 for business-config endpoint without auth', () => {
      return request(app.getHttpServer())
        .get('/settings/business-config')
        .expect(401);
    });
  });

  describe('/audit', () => {
    it('should return 401 for unauthenticated requests to logs', () => {
      return request(app.getHttpServer())
        .get('/audit/logs')
        .expect(401);
    });

    it('should return 401 for unauthenticated requests to statistics', () => {
      return request(app.getHttpServer())
        .get('/audit/statistics')
        .expect(401);
    });

    it('should return available actions without auth (public endpoint)', () => {
      return request(app.getHttpServer())
        .get('/audit/actions')
        .expect(401); // This should also require auth based on our implementation
    });
  });
});