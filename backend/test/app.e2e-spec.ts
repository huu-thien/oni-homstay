import { INestApplication, RequestMethod } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

type ApiSuccess<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type RoomCard = {
  id: string;
  slug: string;
  name: string;
};

type RoomDetail = {
  slug: string;
  name: string;
  bedroomCount: number;
  images: unknown[];
};

type AuthPayload = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    status?: string;
  };
};

type BookingCheckoutPayload = {
  bookingId: string;
  bookingCode: string;
  status: string;
  payment: {
    paymentId: string;
    provider: string;
    status: string;
  };
};

type PaymentStatusPayload = {
  bookingCode: string;
  status: string;
  paymentStatus: string;
  payment?: {
    status: string;
  };
};

type AdminRoomPayload = {
  id: string;
  slug: string;
  roomType: string;
  pricePerNight: number;
  amenities: string[];
  images: unknown[];
  name?: string;
  status?: string;
};

type AdminUserPayload = {
  id: string;
  email: string;
  role: string;
  status: string;
  mustChangePassword?: boolean;
};

type UploadImagePayload = {
  name: string;
  s3Key: string;
  url: string;
};

function getBody<T>(response: { body: unknown }) {
  return response.body as ApiSuccess<T>;
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  async function login(identifier: string, password: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier,
        password,
      });

    const body = getBody<AuthPayload>(response);
    return body.data.accessToken;
  }

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: [{ path: 'health', method: RequestMethod.GET }],
    });
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({
      status: 'ok',
      service: 'homestay-backend',
    });
  });

  it('/api/v1 (GET)', () => {
    return request(app.getHttpServer()).get('/api/v1').expect(200).expect({
      service: 'homestay-backend',
      status: 'ok',
      version: '0.1.0',
      basePath: '/api/v1',
    });
  });

  it('/api/v1/rooms (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/rooms');
    const body = getBody<{ items: RoomCard[] }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(3);
    expect(body.data.items[0]).toMatchObject({
      slug: 'garden-suite',
      name: 'Garden Suite',
    });
  });

  it('/api/v1/rooms/availability (GET)', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/rooms/availability?checkInDate=2026-07-26&checkOutDate=2026-07-28&guestCount=2',
    );
    const body = getBody<
      {
        roomId: string;
        slug: string;
        available: boolean;
        nightCount: number;
      }[]
    >(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data[0]).toMatchObject({
      slug: 'river-deluxe',
      available: true,
      nightCount: 2,
    });
    expect(body.data.some((item) => item.slug === 'garden-suite')).toBe(false);
  });

  it('/api/v1/rooms/:slug (GET)', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/rooms/garden-suite',
    );
    const body = getBody<RoomDetail>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      slug: 'garden-suite',
      name: 'Garden Suite',
      bedroomCount: 1,
    });
    expect(body.data.images).toHaveLength(4);
  });

  it('/api/v1/auth/register (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Tran Thi Demo',
        email: 'demo@example.com',
        phone: '0909999999',
        password: 'StrongPass123',
      });
    const body = getBody<{ user: AuthPayload['user'] }>(response);

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.user).toMatchObject({
      email: 'demo@example.com',
      fullName: 'Tran Thi Demo',
      role: 'CUSTOMER',
    });
  });

  it('/api/v1/auth/login (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: 'minhanh@gmail.com',
        password: 'Customer@123',
      });
    const body = getBody<AuthPayload>(response);

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.user).toMatchObject({
      email: 'minhanh@gmail.com',
      role: 'CUSTOMER',
    });
  });

  it('/api/v1/auth/forgot-password (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({
        email: 'minhanh@gmail.com',
      });
    const body = getBody<{ sent: boolean }>(response);

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({
      sent: true,
    });
  });

  it('guest checkout creates pending booking, confirms payment, and auto-creates account', async () => {
    const roomsResponse = await request(app.getHttpServer()).get(
      '/api/v1/rooms',
    );
    const roomsBody = getBody<{ items: RoomCard[] }>(roomsResponse);
    const gardenSuite = roomsBody.data.items.find(
      (item) => item.slug === 'garden-suite',
    );

    expect(gardenSuite).toBeDefined();
    if (!gardenSuite) {
      throw new Error('Garden Suite seed room was not found.');
    }

    const checkoutResponse = await request(app.getHttpServer())
      .post('/api/v1/bookings/guest-checkout')
      .send({
        roomId: gardenSuite.id,
        checkInDate: '2026-08-14',
        checkOutDate: '2026-08-16',
        guestCount: 2,
        guestName: 'Pham Thanh Nha',
        guestEmail: 'phamthanhnha@example.com',
        guestPhone: '0909555444',
        note: 'Muon phong yen tinh',
      });
    const checkoutBody = getBody<BookingCheckoutPayload>(checkoutResponse);

    expect(checkoutResponse.status).toBe(201);
    expect(checkoutBody.success).toBe(true);
    expect(checkoutBody.data).toMatchObject({
      status: 'PENDING_PAYMENT',
      payment: {
        provider: 'MOCKPAY',
        status: 'PENDING',
      },
    });

    const bookingId = checkoutBody.data.bookingId;
    const paymentId = checkoutBody.data.payment.paymentId;
    const bookingCode = checkoutBody.data.bookingCode;

    const pendingStatusResponse = await request(app.getHttpServer()).get(
      `/api/v1/payments/${bookingId}/status`,
    );
    const pendingStatusBody = getBody<PaymentStatusPayload>(
      pendingStatusResponse,
    );

    expect(pendingStatusResponse.status).toBe(200);
    expect(pendingStatusBody.data).toMatchObject({
      bookingCode,
      status: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
    });

    const availabilityResponse = await request(app.getHttpServer()).get(
      '/api/v1/rooms/availability?checkInDate=2026-08-14&checkOutDate=2026-08-16&guestCount=2',
    );
    const availabilityBody =
      getBody<{ roomId: string }[]>(availabilityResponse);

    expect(
      availabilityBody.data.some((item) => item.roomId === gardenSuite.id),
    ).toBe(false);

    const paymentCompleteResponse = await request(app.getHttpServer()).post(
      `/api/v1/payments/mock/${paymentId}/complete`,
    );
    const paymentCompleteBody = getBody<PaymentStatusPayload>(
      paymentCompleteResponse,
    );

    expect(paymentCompleteResponse.status).toBe(201);
    expect(paymentCompleteBody.data).toMatchObject({
      bookingCode,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      payment: {
        status: 'PAID',
      },
    });

    const bookingDetailResponse = await request(app.getHttpServer()).get(
      `/api/v1/bookings/code/${bookingCode}`,
    );
    const bookingDetailBody = getBody<{
      bookingCode: string;
      status: string;
      guestEmail: string;
    }>(bookingDetailResponse);

    expect(bookingDetailResponse.status).toBe(200);
    expect(bookingDetailBody.data).toMatchObject({
      bookingCode,
      status: 'CONFIRMED',
      guestEmail: 'phamthanhnha@example.com',
    });

    const adminToken = await login('admin', 'Admin@123');
    const usersResponse = await request(app.getHttpServer())
      .get(
        '/api/v1/admin/users?page=1&limit=20&keyword=phamthanhnha@example.com',
      )
      .set('Authorization', `Bearer ${adminToken}`);
    const usersBody = getBody<{ items: AdminUserPayload[] }>(usersResponse);

    expect(usersResponse.status).toBe(200);
    expect(
      usersBody.data.items.some(
        (item) => item.email === 'phamthanhnha@example.com',
      ),
    ).toBe(true);
  });

  it('admin can access protected room list', async () => {
    const adminToken = await login('admin', 'Admin@123');
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/rooms?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);
    const body = getBody<{ items: AdminRoomPayload[] }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.items.length).toBeGreaterThan(0);
  });

  it('customer cannot access admin endpoints', async () => {
    const customerToken = await login('minhanh@gmail.com', 'Customer@123');
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/users?page=1&limit=10')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(response.status).toBe(403);
  });

  it('admin analytics returns summary', async () => {
    const adminToken = await login('admin', 'Admin@123');
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/analytics/dashboard-summary')
      .set('Authorization', `Bearer ${adminToken}`);
    const body = getBody<{ activeRooms: number; totalRevenue: number }>(
      response,
    );

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(typeof body.data.activeRooms).toBe('number');
    expect(typeof body.data.totalRevenue).toBe('number');
  });

  it('admin can create update and delete room', async () => {
    const adminToken = await login('admin', 'Admin@123');
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/admin/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Lagoon Retreat',
        slug: 'lagoon-retreat',
        roomType: 'DELUXE',
        shortDescription: 'Phong cach Hue hien dai voi view ho nuoc.',
        description:
          'Khong gian nghi duong yen tinh danh cho cap doi hoac gia dinh nho.',
        pricePerNight: 1450000,
        maxGuests: 3,
        bedroomCount: 1,
        bedCount: 2,
        bathroomCount: 1,
        sizeSqm: 38,
        featuredOrder: 4,
        status: 'ACTIVE',
        amenities: ['Bon tam', 'Ban cong rieng'],
        images: [
          {
            name: 'cover',
            url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85',
            s3Key: 'rooms/lagoon-retreat/cover.jpg',
            contentType: 'image/jpeg',
            sizeBytes: 204800,
            altText: 'Lagoon Retreat cover',
            isCover: true,
            sortOrder: 1,
          },
        ],
      });
    const createBody = getBody<AdminRoomPayload>(createResponse);

    expect(createResponse.status).toBe(201);
    expect(createBody.success).toBe(true);
    expect(createBody.data).toMatchObject({
      slug: 'lagoon-retreat',
      roomType: 'DELUXE',
      pricePerNight: 1450000,
    });

    const roomId = createBody.data.id;

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/admin/rooms/${roomId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...createBody.data,
        name: 'Lagoon Retreat Signature',
        shortDescription: 'Da cap nhat mo ta phong.',
        description: 'Phong da duoc cap nhat thong tin chi tiet.',
        pricePerNight: 1650000,
        maxGuests: 4,
        bedroomCount: 1,
        bedCount: 2,
        bathroomCount: 1,
        sizeSqm: 40,
        featuredOrder: 5,
        status: 'MAINTENANCE',
        amenities: createBody.data.amenities,
        images: createBody.data.images,
      });
    const updateBody = getBody<AdminRoomPayload>(updateResponse);

    expect(updateResponse.status).toBe(200);
    expect(updateBody.data).toMatchObject({
      name: 'Lagoon Retreat Signature',
      status: 'MAINTENANCE',
      pricePerNight: 1650000,
    });

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/api/v1/admin/rooms/${roomId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toEqual({
      success: true,
      data: { deleted: true },
      message: 'Xóa phòng thành công.',
    });
  });

  it('admin can upload room images through storage endpoint', async () => {
    const adminToken = await login('admin', 'Admin@123');
    const response = await request(app.getHttpServer())
      .post('/api/v1/admin/uploads/room-images')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('roomSlug', 'storage-test-room')
      .attach('files', Buffer.from([0xff, 0xd8, 0xff, 0xd9]), {
        filename: 'storage-test.jpg',
        contentType: 'image/jpeg',
      });
    const body = getBody<UploadImagePayload[]>(response);

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data[0]?.name).toBe('storage-test');
    expect(body.data[0]?.s3Key).toContain('rooms/storage-test-room/');
    expect(body.data[0]?.url).toContain('/uploads/rooms/storage-test-room/');
  });

  it('admin can manage bookings and users', async () => {
    const adminToken = await login('admin', 'Admin@123');

    const bookingsResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/bookings?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);
    const bookingsBody = getBody<{ items: { id: string }[] }>(bookingsResponse);

    expect(bookingsResponse.status).toBe(200);
    expect(bookingsBody.success).toBe(true);
    expect(bookingsBody.data.items.length).toBeGreaterThan(0);

    const bookingId = bookingsBody.data.items[0].id;
    const bookingStatusResponse = await request(app.getHttpServer())
      .patch(`/api/v1/admin/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CHECKED_IN' });
    const bookingStatusBody = getBody<{ status: string }>(
      bookingStatusResponse,
    );

    expect(bookingStatusResponse.status).toBe(200);
    expect(bookingStatusBody.data.status).toBe('CHECKED_IN');

    const createUserResponse = await request(app.getHttpServer())
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Staff Demo',
        email: 'staff-demo@example.com',
        phone: '0912345678',
        password: 'StaffDemo@123',
        role: 'STAFF',
        status: 'ACTIVE',
      });
    const createUserBody = getBody<AdminUserPayload>(createUserResponse);

    expect(createUserResponse.status).toBe(201);
    expect(createUserBody.data).toMatchObject({
      email: 'staff-demo@example.com',
      role: 'STAFF',
      status: 'ACTIVE',
    });

    const userId = createUserBody.data.id;

    const updateUserResponse = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${userId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' });
    const updateUserBody = getBody<AdminUserPayload>(updateUserResponse);

    expect(updateUserResponse.status).toBe(200);
    expect(updateUserBody.data.status).toBe('SUSPENDED');

    const usersResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/users?page=1&limit=10&role=STAFF')
      .set('Authorization', `Bearer ${adminToken}`);
    const usersBody = getBody<{ items: AdminUserPayload[] }>(usersResponse);

    expect(usersResponse.status).toBe(200);
    expect(
      usersBody.data.items.some(
        (item) => item.email === 'staff-demo@example.com',
      ),
    ).toBe(true);
  });

  afterEach(async () => {
    await app.close();
  });
});
