import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getApiInfo() {
    return {
      service: 'homestay-backend',
      status: 'ok',
      version: '0.1.0',
      basePath: '/api/v1',
    };
  }

  getHealth() {
    return {
      status: 'ok',
      service: 'homestay-backend',
    };
  }
}
