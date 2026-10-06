import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashPassword } from '../auth/password.util';
import { mockRooms, seedBookings, seedUsers } from '../shared/mock-data';
import { AmenityEntity } from './entities/amenity.entity';
import { BookingEntity } from './entities/booking.entity';
import { PaymentEntity } from './entities/payment.entity';
import { RoleEntity } from './entities/role.entity';
import { RoomImageEntity } from './entities/room-image.entity';
import { RoomEntity } from './entities/room.entity';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class DatabaseSeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(AmenityEntity)
    private readonly amenityRepository: Repository<AmenityEntity>,
    @InjectRepository(RoomEntity)
    private readonly roomRepository: Repository<RoomEntity>,
    @InjectRepository(RoomImageEntity)
    private readonly roomImageRepository: Repository<RoomImageEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedRoles();
    await this.seedUsers();
    await this.seedAmenities();
    await this.seedRooms();
    await this.seedBookings();
    await this.seedPayments();
  }

  private async seedRoles() {
    if ((await this.roleRepository.count()) > 0) {
      return;
    }

    await this.roleRepository.save([
      this.roleRepository.create({ code: 'CUSTOMER', name: 'Customer' }),
      this.roleRepository.create({ code: 'STAFF', name: 'Staff' }),
      this.roleRepository.create({ code: 'ADMIN', name: 'Admin' }),
    ]);
  }

  private async seedUsers() {
    if ((await this.userRepository.count()) > 0) {
      return;
    }

    const roles = await this.roleRepository.find();
    const roleMap = new Map(roles.map((role) => [role.code, role]));

    await this.userRepository.save(
      seedUsers.map((user) =>
        this.userRepository.create({
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          passwordHash: hashPassword(user.password),
          status: user.status,
          mustChangePassword: false,
          role: roleMap.get(user.role)!,
        }),
      ),
    );
  }

  private async seedAmenities() {
    if ((await this.amenityRepository.count()) > 0) {
      return;
    }

    const uniqueAmenities = Array.from(
      new Set(mockRooms.flatMap((room) => room.amenities)),
    );

    await this.amenityRepository.save(
      uniqueAmenities.map((name) =>
        this.amenityRepository.create({
          code: toAmenityCode(name),
          name,
          icon: null,
        }),
      ),
    );
  }

  private async seedRooms() {
    if ((await this.roomRepository.count()) > 0) {
      return;
    }

    const amenities = await this.amenityRepository.find();

    for (const [index, room] of mockRooms.entries()) {
      const roomEntity = this.roomRepository.create({
        slug: room.slug,
        name: room.name,
        roomType: room.roomType,
        shortDescription: room.shortDescription,
        description: room.description,
        pricePerNight: String(room.pricePerNight),
        maxGuests: room.maxGuests,
        bedroomCount: room.bedroomCount,
        bedCount: room.bedCount,
        bathroomCount: room.bathroomCount,
        sizeSqm: room.sizeSqm,
        featuredOrder: index + 1,
        status: room.status,
        checkInTime: room.checkIn,
        checkOutTime: room.checkOut,
        heroImageUrl: room.heroImage,
        cardImageUrl: room.cardImage,
        highlightText: room.highlight,
        bedInfo: room.bedInfo,
        password: room.password || null,
        atmosphereTags: room.atmosphere.join('|'),
        featureTags: room.features.join('|'),
        amenities: amenities.filter((item) =>
          room.amenities.includes(item.name),
        ),
        images: room.gallery.map((image, index) => {
          const entity = new RoomImageEntity();
          entity.s3Key = `rooms/seed/${room.slug}/${index + 1}.jpg`;
          entity.url = image.image;
          entity.contentType = 'image/jpeg';
          entity.sizeBytes = null;
          entity.altText = image.title;
          entity.sortOrder = index + 1;
          entity.isCover = index === 0;
          return entity;
        }),
      });

      await this.roomRepository.save(roomEntity);
    }
  }

  private async seedBookings() {
    if ((await this.bookingRepository.count()) > 0) {
      return;
    }

    const rooms = await this.roomRepository.find();
    const users = await this.userRepository.find({ relations: { role: true } });
    const roomMap = new Map(rooms.map((room) => [room.slug, room]));
    const userMap = new Map(users.map((user) => [user.email, user]));

    await this.bookingRepository.save(
      seedBookings.map((booking) =>
        this.bookingRepository.create({
          bookingCode: booking.bookingCode,
          room: roomMap.get(booking.roomSlug)!,
          user: booking.userEmail
            ? (userMap.get(booking.userEmail) ?? null)
            : null,
          bookingSource: booking.bookingSource,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          guestPhone: booking.guestPhone,
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate,
          guestCount: booking.guestCount,
          roomPriceSnapshot: String(
            Math.round(
              booking.totalAmount /
                calculateNightCount(booking.checkInDate, booking.checkOutDate),
            ),
          ),
          totalAmount: String(booking.totalAmount),
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          note: booking.note ?? null,
          holdExpiresAt: null,
          confirmedAt:
            booking.paymentStatus === 'PAID'
              ? new Date(booking.createdAt)
              : null,
          cancelledAt:
            booking.status === 'CANCELLED' ? new Date(booking.createdAt) : null,
          refundedAt:
            booking.status === 'REFUNDED' ? new Date(booking.createdAt) : null,
          createdAt: new Date(booking.createdAt),
          updatedAt: new Date(booking.createdAt),
        }),
      ),
    );
  }

  private async seedPayments() {
    if ((await this.paymentRepository.count()) > 0) {
      return;
    }

    const bookings = await this.bookingRepository.find({
      relations: { room: true, user: true },
    });

    await this.paymentRepository.save(
      bookings.map((booking) =>
        this.paymentRepository.create({
          booking,
          provider: 'MOCKPAY',
          providerOrderId: `MOCKPAY-SEED-${booking.bookingCode}`,
          amount: booking.totalAmount,
          status:
            booking.paymentStatus === 'PAID'
              ? 'PAID'
              : booking.paymentStatus === 'REFUNDED'
                ? 'REFUNDED'
                : booking.paymentStatus,
          checkoutUrl: `http://localhost:3000/api/v1/payments/mock/${booking.id}/checkout`,
          qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(`http://localhost:3000/api/v1/payments/mock/${booking.id}/checkout`)}`,
          providerTransactionId:
            booking.paymentStatus === 'PAID'
              ? `SEEDTXN-${booking.bookingCode}`
              : null,
          expiresAt: booking.holdExpiresAt ?? null,
          paidAt:
            booking.paymentStatus === 'PAID'
              ? new Date(booking.createdAt)
              : null,
          failureReason: null,
          providerPayload: JSON.stringify({ seeded: true }),
          createdAt: new Date(booking.createdAt),
          updatedAt: new Date(booking.createdAt),
        }),
      ),
    );
  }
}

function toAmenityCode(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function calculateNightCount(checkInDate: string, checkOutDate: string) {
  return Math.max(
    1,
    Math.ceil(
      (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );
}
