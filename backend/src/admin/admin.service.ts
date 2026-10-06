import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { hashPassword } from '../auth/password.util';
import { successResponse } from '../common/api-response';
import { AmenityEntity } from '../database/entities/amenity.entity';
import { BookingEntity } from '../database/entities/booking.entity';
import { RoleEntity } from '../database/entities/role.entity';
import { RoomImageEntity } from '../database/entities/room-image.entity';
import { RoomEntity } from '../database/entities/room.entity';
import { UserEntity } from '../database/entities/user.entity';
import { StorageService } from '../storage/storage.service';
import {
  AdminBookingListQueryDto,
  AdminRoomListQueryDto,
  AdminUserListQueryDto,
  AnalyticsRangeQueryDto,
  CreateAdminUserDto,
  ReorderRoomImagesDto,
  RoomImagesPayloadDto,
  UploadRoomImagesDto,
  UpdateAdminUserDto,
  UpdateBookingStatusDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  UpsertAmenityDto,
  UpsertRoomDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(RoomEntity)
    private readonly roomRepository: Repository<RoomEntity>,
    @InjectRepository(RoomImageEntity)
    private readonly roomImageRepository: Repository<RoomImageEntity>,
    @InjectRepository(AmenityEntity)
    private readonly amenityRepository: Repository<AmenityEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    private readonly storageService: StorageService,
  ) {}

  async listRooms(query: AdminRoomListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.roomRepository
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.images', 'image')
      .leftJoinAndSelect('room.amenities', 'amenity')
      .orderBy('room.featured_order', 'ASC')
      .addOrderBy('room.updated_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.keyword) {
      qb.andWhere(
        '(LOWER(room.name) LIKE :keyword OR LOWER(room.slug) LIKE :keyword OR LOWER(room.room_type) LIKE :keyword)',
        {
          keyword: `%${query.keyword.toLowerCase()}%`,
        },
      );
    }

    if (query.status && query.status !== 'ALL') {
      qb.andWhere('room.status = :status', { status: query.status });
    }

    if (query.roomType && query.roomType !== 'ALL') {
      qb.andWhere('room.room_type = :roomType', { roomType: query.roomType });
    }

    const [rooms, total] = await qb.getManyAndCount();

    return successResponse({
      items: await Promise.all(
        rooms.map((room) => this.toAdminRoomSummary(room)),
      ),
      pagination: buildPagination(page, limit, total),
    });
  }

  async getRoomDetail(id: string) {
    const room = await this.getRoomEntityById(id);
    return successResponse(await this.toAdminRoomDetail(room));
  }

  async createRoom(payload: UpsertRoomDto) {
    const existing = await this.roomRepository.findOne({
      where: { slug: payload.slug },
    });

    if (existing) {
      throw new ConflictException('Slug phòng đã tồn tại.');
    }

    const room = this.roomRepository.create();
    await this.assignRoomFromPayload(room, payload);
    const savedRoom = await this.roomRepository.save(room);
    await this.syncRoomImages(savedRoom, payload.images ?? []);
    return successResponse(
      await this.toAdminRoomDetail(await this.getRoomEntityById(savedRoom.id)),
      'Tạo phòng thành công.',
    );
  }

  async updateRoom(id: string, payload: UpsertRoomDto) {
    const room = await this.getRoomEntityById(id);
    const duplicate = await this.roomRepository.findOne({
      where: { slug: payload.slug },
    });

    if (duplicate && duplicate.id !== id) {
      throw new ConflictException('Slug phòng đã tồn tại.');
    }

    await this.assignRoomFromPayload(room, payload);
    await this.roomRepository.save(room);
    await this.syncRoomImages(room, payload.images ?? []);
    return successResponse(
      await this.toAdminRoomDetail(await this.getRoomEntityById(id)),
      'Cập nhật phòng thành công.',
    );
  }

  async deleteRoom(id: string) {
    const room = await this.getRoomEntityById(id);
    for (const image of room.images) {
      await this.storageService.deleteAsset(image.s3Key);
    }
    await this.roomRepository.remove(room);
    return successResponse({ deleted: true }, 'Xóa phòng thành công.');
  }

  async uploadRoomImages(roomId: string, payload: RoomImagesPayloadDto) {
    const room = await this.getRoomEntityById(roomId);
    const images = payload.items.map((item, index) =>
      this.roomImageRepository.create({
        room,
        s3Key: item.s3Key,
        url: item.url,
        contentType: item.contentType ?? null,
        sizeBytes: item.sizeBytes ? String(item.sizeBytes) : null,
        altText: item.altText ?? item.name,
        isCover: item.isCover,
        sortOrder: item.sortOrder || index + 1,
      }),
    );

    const saved = await this.roomImageRepository.save(images);
    return successResponse(
      saved.map(mapRoomImage),
      'Thêm ảnh phòng thành công.',
    );
  }

  async reorderRoomImages(roomId: string, payload: ReorderRoomImagesDto) {
    await this.getRoomEntityById(roomId);
    const existingImages = await this.roomImageRepository.find({
      where: { room: { id: roomId } },
      relations: { room: true },
    });

    for (const image of existingImages) {
      const nextState = payload.images.find((item) => item.id === image.id);

      if (nextState) {
        image.sortOrder = nextState.sortOrder;
        image.isCover = nextState.isCover;
      }
    }

    await this.roomImageRepository.save(existingImages);
    return successResponse(
      existingImages.map(mapRoomImage),
      'Cập nhật thứ tự ảnh thành công.',
    );
  }

  async deleteRoomImage(roomId: string, imageId: string) {
    const image = await this.roomImageRepository.findOne({
      where: { id: imageId, room: { id: roomId } },
      relations: { room: true },
    });

    if (!image) {
      throw new NotFoundException('Không tìm thấy ảnh phòng.');
    }

    await this.storageService.deleteAsset(image.s3Key);
    await this.roomImageRepository.remove(image);
    return successResponse({ deleted: true }, 'Xóa ảnh phòng thành công.');
  }

  async uploadRoomImagesToStorage(
    files: Express.Multer.File[],
    payload: UploadRoomImagesDto,
  ) {
    const uploaded = await this.storageService.uploadRoomImages(
      files,
      payload.roomSlug ?? 'draft-room',
    );

    return successResponse(
      uploaded.map((image, index) => ({
        id: '',
        name: image.altText ?? image.name,
        url: image.url,
        s3Key: image.s3Key,
        contentType: image.contentType ?? undefined,
        sizeBytes: image.sizeBytes,
        altText: image.altText ?? undefined,
        isCover: index === 0,
        sortOrder: index + 1,
      })),
      'Upload ảnh lên storage thành công.',
    );
  }

  async listAmenities() {
    const items = await this.amenityRepository.find({
      order: { name: 'ASC' },
    });

    return successResponse(
      items.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        icon: item.icon,
      })),
    );
  }

  async createAmenity(payload: UpsertAmenityDto) {
    const existing = await this.amenityRepository.findOne({
      where: [{ code: payload.code }, { name: payload.name }],
    });

    if (existing) {
      throw new ConflictException('Amenity đã tồn tại.');
    }

    const amenity = await this.amenityRepository.save(
      this.amenityRepository.create({
        code: payload.code,
        name: payload.name,
        icon: payload.icon ?? null,
      }),
    );

    return successResponse(amenity, 'Tạo tiện nghi thành công.');
  }

  async updateAmenity(id: string, payload: UpsertAmenityDto) {
    const amenity = await this.amenityRepository.findOneBy({ id });

    if (!amenity) {
      throw new NotFoundException('Không tìm thấy tiện nghi.');
    }

    amenity.code = payload.code;
    amenity.name = payload.name;
    amenity.icon = payload.icon ?? null;
    await this.amenityRepository.save(amenity);
    return successResponse(amenity, 'Cập nhật tiện nghi thành công.');
  }

  async deleteAmenity(id: string) {
    const amenity = await this.amenityRepository.findOneBy({ id });

    if (!amenity) {
      throw new NotFoundException('Không tìm thấy tiện nghi.');
    }

    await this.amenityRepository.remove(amenity);
    return successResponse({ deleted: true }, 'Xóa tiện nghi thành công.');
  }

  async listBookings(query: AdminBookingListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.room', 'room')
      .leftJoinAndSelect('booking.user', 'user')
      .orderBy('booking.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.roomId) {
      qb.andWhere('booking.room_id = :roomId', { roomId: query.roomId });
    }

    if (query.status && query.status !== 'ALL') {
      qb.andWhere('booking.status = :status', { status: query.status });
    }

    if (query.paymentStatus && query.paymentStatus !== 'ALL') {
      qb.andWhere('booking.payment_status = :paymentStatus', {
        paymentStatus: query.paymentStatus,
      });
    }

    if (query.checkInFrom) {
      qb.andWhere('booking.check_in_date >= :checkInFrom', {
        checkInFrom: query.checkInFrom,
      });
    }

    if (query.checkInTo) {
      qb.andWhere('booking.check_in_date <= :checkInTo', {
        checkInTo: query.checkInTo,
      });
    }

    if (query.keyword) {
      qb.andWhere(
        '(LOWER(booking.booking_code) LIKE :keyword OR LOWER(booking.guest_name) LIKE :keyword OR LOWER(booking.guest_email) LIKE :keyword)',
        {
          keyword: `%${query.keyword.toLowerCase()}%`,
        },
      );
    }

    const [bookings, total] = await qb.getManyAndCount();

    return successResponse({
      items: bookings.map((booking) => this.toAdminBookingSummary(booking)),
      pagination: buildPagination(page, limit, total),
    });
  }

  async getBookingDetail(id: string) {
    const booking = await this.getBookingEntity(id);
    return successResponse(this.toAdminBookingSummary(booking));
  }

  async updateBookingStatus(id: string, payload: UpdateBookingStatusDto) {
    const booking = await this.getBookingEntity(id);
    booking.status = payload.status;

    if (payload.status === 'REFUNDED') {
      booking.paymentStatus = 'REFUNDED';
    }

    await this.bookingRepository.save(booking);
    return successResponse(
      this.toAdminBookingSummary(booking),
      'Cập nhật trạng thái booking thành công.',
    );
  }

  async cancelBooking(id: string) {
    const booking = await this.getBookingEntity(id);
    booking.status = 'CANCELLED';
    await this.bookingRepository.save(booking);
    return successResponse(
      this.toAdminBookingSummary(booking),
      'Đã hủy booking.',
    );
  }

  async refundBooking(id: string) {
    const booking = await this.getBookingEntity(id);
    booking.status = 'REFUNDED';
    booking.paymentStatus = 'REFUNDED';
    await this.bookingRepository.save(booking);
    return successResponse(
      this.toAdminBookingSummary(booking),
      'Đã hoàn tiền booking.',
    );
  }

  async listUsers(query: AdminUserListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .orderBy('user.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.role && query.role !== 'ALL') {
      qb.andWhere('role.code = :roleCode', { roleCode: query.role });
    }

    if (query.status && query.status !== 'ALL') {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    if (query.keyword) {
      qb.andWhere(
        '(LOWER(user.full_name) LIKE :keyword OR LOWER(user.email) LIKE :keyword OR LOWER(user.phone) LIKE :keyword)',
        {
          keyword: `%${query.keyword.toLowerCase()}%`,
        },
      );
    }

    const [users, total] = await qb.getManyAndCount();
    const items = await Promise.all(
      users.map((user) => this.toAdminUserSummary(user)),
    );

    return successResponse({
      items,
      pagination: buildPagination(page, limit, total),
    });
  }

  async getUserDetail(id: string) {
    const user = await this.getUserEntity(id);
    return successResponse(await this.toAdminUserSummary(user));
  }

  async createUser(payload: CreateAdminUserDto) {
    const duplicate = await this.userRepository.findOne({
      where: [{ email: payload.email.toLowerCase() }, { phone: payload.phone }],
    });

    if (duplicate) {
      throw new ConflictException('Email hoặc số điện thoại đã tồn tại.');
    }

    const role = await this.roleRepository.findOneByOrFail({
      code: payload.role,
    });
    const user = await this.userRepository.save(
      this.userRepository.create({
        fullName: payload.fullName.trim(),
        email: payload.email.trim().toLowerCase(),
        phone: payload.phone.trim(),
        passwordHash: hashPassword(payload.password),
        status: payload.status,
        role,
      }),
    );

    return successResponse(
      await this.toAdminUserSummary(user),
      'Tạo user thành công.',
    );
  }

  async updateUser(id: string, payload: UpdateAdminUserDto) {
    const user = await this.getUserEntity(id);
    user.fullName = payload.fullName?.trim() ?? user.fullName;
    user.email = payload.email?.trim().toLowerCase() ?? user.email;
    user.phone = payload.phone?.trim() ?? user.phone;
    await this.userRepository.save(user);
    return successResponse(
      await this.toAdminUserSummary(user),
      'Cập nhật user thành công.',
    );
  }

  async updateUserRole(id: string, payload: UpdateUserRoleDto) {
    const user = await this.getUserEntity(id);
    user.role = await this.roleRepository.findOneByOrFail({
      code: payload.role,
    });
    await this.userRepository.save(user);
    return successResponse(
      await this.toAdminUserSummary(user),
      'Cập nhật role thành công.',
    );
  }

  async updateUserStatus(id: string, payload: UpdateUserStatusDto) {
    const user = await this.getUserEntity(id);
    user.status = payload.status;
    await this.userRepository.save(user);
    return successResponse(
      await this.toAdminUserSummary(user),
      'Cập nhật trạng thái user thành công.',
    );
  }

  async getDashboardSummary() {
    const [activeRooms, confirmedBookings, paidRevenue, rooms] =
      await Promise.all([
        this.roomRepository.count({ where: { status: 'ACTIVE' } }),
        this.bookingRepository.count({
          where: [
            { status: 'CONFIRMED' },
            { status: 'CHECKED_IN' },
            { status: 'CHECKED_OUT' },
          ],
        }),
        this.bookingRepository.find({
          where: [{ paymentStatus: 'PAID' }, { paymentStatus: 'REFUNDED' }],
          relations: { room: true },
        }),
        this.roomRepository.find(),
      ]);

    const totalRevenue = paidRevenue
      .filter((item) => item.paymentStatus === 'PAID')
      .reduce((sum, booking) => sum + Number(booking.totalAmount), 0);
    const averageOccupancyRate = this.computeAverageOccupancy(
      rooms,
      paidRevenue,
    );

    return successResponse({
      totalRevenue,
      confirmedBookings,
      averageOccupancyRate,
      activeRooms,
    });
  }

  async getRevenueTimeline(query: AnalyticsRangeQueryDto) {
    const bookings = await this.bookingRepository.find({
      where: [
        { paymentStatus: 'PAID' },
        { paymentStatus: 'UNPAID' },
        { paymentStatus: 'REFUNDED' },
      ],
      relations: { room: true },
      order: { createdAt: 'ASC' },
    });

    const items = aggregateRevenueTimeline(bookings, query.range ?? '90d');
    return successResponse(items);
  }

  async getTopRooms() {
    const bookings = await this.bookingRepository.find({
      relations: { room: true },
    });

    const revenueByRoom = new Map<
      string,
      { roomName: string; revenue: number }
    >();

    for (const booking of bookings) {
      const key = booking.room.id;
      const current = revenueByRoom.get(key) ?? {
        roomName: booking.room.name,
        revenue: 0,
      };

      if (booking.paymentStatus === 'PAID') {
        current.revenue += Number(booking.totalAmount);
      }

      revenueByRoom.set(key, current);
    }

    return successResponse(
      Array.from(revenueByRoom.values())
        .sort((left, right) => right.revenue - left.revenue)
        .map((item) => ({
          roomName: item.roomName,
          revenue: item.revenue,
        })),
    );
  }

  private async assignRoomFromPayload(
    room: RoomEntity,
    payload: UpsertRoomDto,
  ) {
    const coverImage = payload.images?.find((image) => image.isCover);

    room.name = payload.name.trim();
    room.slug = payload.slug.trim();
    room.roomType = payload.roomType.trim().toUpperCase();
    room.shortDescription = payload.shortDescription.trim();
    room.description = payload.description.trim();
    room.pricePerNight = String(payload.pricePerNight);
    room.maxGuests = payload.maxGuests;
    room.bedroomCount = payload.bedroomCount;
    room.bedCount = payload.bedCount;
    room.bathroomCount = payload.bathroomCount;
    room.sizeSqm = payload.sizeSqm;
    room.featuredOrder = payload.featuredOrder;
    room.status = payload.status;
    room.checkInTime = room.checkInTime ?? '14:00';
    room.checkOutTime = room.checkOutTime ?? '12:00';
    room.highlightText = room.highlightText ?? payload.shortDescription.trim();
    room.bedInfo = room.bedInfo ?? `${payload.bedCount} giường`;
    room.heroImageUrl = coverImage?.url ?? room.heroImageUrl ?? '';
    room.cardImageUrl = coverImage?.url ?? room.cardImageUrl ?? '';
    room.atmosphereTags = room.atmosphereTags ?? '';
    room.featureTags = room.featureTags ?? '';
    room.password = payload.password?.trim() || null;
    room.amenities = await this.resolveAmenities(payload);
  }

  private async syncRoomImages(
    room: RoomEntity,
    images: UpsertRoomDto['images'],
  ) {
    const existingImages = room.id
      ? await this.roomImageRepository.find({
          where: { room: { id: room.id } },
          relations: { room: true },
        })
      : [];

    const existingById = new Map(
      existingImages.map((image) => [image.id, image]),
    );
    const nextIds = new Set(images?.map((image) => image.id).filter(Boolean));
    const imagesToRemove = existingImages.filter(
      (image) => !nextIds.has(image.id),
    );

    if (imagesToRemove.length) {
      for (const image of imagesToRemove) {
        await this.storageService.deleteAsset(image.s3Key);
      }
      await this.roomImageRepository.remove(imagesToRemove);
    }

    if (!images?.length) {
      return;
    }

    const nextImages = images.map((image, index) => {
      const current = image.id ? existingById.get(image.id) : null;

      return this.roomImageRepository.create({
        id: current?.id ?? image.id,
        room,
        s3Key: image.s3Key,
        url: image.url,
        contentType: image.contentType ?? null,
        sizeBytes: image.sizeBytes ? String(image.sizeBytes) : null,
        altText: image.altText ?? image.name,
        isCover: image.isCover,
        sortOrder: image.sortOrder || index + 1,
      });
    });

    await this.roomImageRepository.save(nextImages);
  }

  private async resolveAmenities(payload: UpsertRoomDto) {
    if (payload.amenityIds?.length) {
      return this.amenityRepository.findBy({ id: In(payload.amenityIds) });
    }

    if (!payload.amenities?.length) {
      return [];
    }

    const resolved: AmenityEntity[] = [];

    for (const name of payload.amenities) {
      const normalizedName = name.trim();
      let amenity = await this.amenityRepository.findOne({
        where: { name: normalizedName },
      });

      if (!amenity) {
        amenity = await this.amenityRepository.save(
          this.amenityRepository.create({
            code: toAmenityCode(normalizedName),
            name: normalizedName,
            icon: null,
          }),
        );
      }

      resolved.push(amenity);
    }

    return resolved;
  }

  private async getRoomEntityById(id: string) {
    const room = await this.roomRepository.findOne({
      where: { id },
      relations: { images: true, amenities: true },
    });

    if (!room) {
      throw new NotFoundException('Không tìm thấy phòng.');
    }

    return room;
  }

  private async getBookingEntity(id: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: { room: true, user: true },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy booking.');
    }

    return booking;
  }

  private async getUserEntity(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy user.');
    }

    return user;
  }

  private async toAdminRoomSummary(room: RoomEntity) {
    const occupancyRate = await this.computeRoomOccupancy(room.id);
    const coverImage =
      [...room.images]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .find((image) => image.isCover) ?? room.images[0];

    return {
      id: room.id,
      slug: room.slug,
      name: room.name,
      roomType: room.roomType,
      shortDescription: room.shortDescription ?? '',
      description: room.description,
      pricePerNight: Number(room.pricePerNight),
      maxGuests: room.maxGuests,
      bedroomCount: room.bedroomCount,
      bedCount: room.bedCount,
      bathroomCount: room.bathroomCount,
      sizeSqm: room.sizeSqm,
      featuredOrder: room.featuredOrder,
      status: room.status,
      occupancyRate,
      coverImage:
        coverImage?.url ?? room.cardImageUrl ?? room.heroImageUrl ?? '',
      images: [...room.images]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(mapRoomImage),
      amenities: room.amenities.map((amenity) => amenity.name),
      password: room.password ?? '',
      updatedAt: room.updatedAt.toISOString().slice(0, 10),
    };
  }

  private async toAdminRoomDetail(room: RoomEntity) {
    return this.toAdminRoomSummary(room);
  }

  private toAdminBookingSummary(booking: BookingEntity) {
    return {
      id: booking.id,
      bookingCode: booking.bookingCode,
      roomId: booking.room.id,
      roomSlug: booking.room.slug,
      roomName: booking.room.name,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail ?? '',
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      totalAmount: Number(booking.totalAmount),
      bookingSource: booking.bookingSource,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      createdAt: booking.createdAt.toISOString().slice(0, 10),
    };
  }

  private async toAdminUserSummary(user: UserEntity) {
    const totalBookings = await this.bookingRepository.count({
      where: { user: { id: user.id } },
    });

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role.code,
      status: user.status,
      totalBookings,
      joinedAt: user.createdAt.toISOString().slice(0, 10),
    };
  }

  private async computeRoomOccupancy(roomId: string) {
    const bookings = await this.bookingRepository.find({
      where: { room: { id: roomId } },
      relations: { room: true },
    });

    const confirmedNights = bookings
      .filter((booking) =>
        ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(booking.status),
      )
      .reduce(
        (sum, booking) =>
          sum + calculateNightCount(booking.checkInDate, booking.checkOutDate),
        0,
      );

    return Math.min(95, Math.max(12, Math.round((confirmedNights / 12) * 20)));
  }

  private computeAverageOccupancy(
    rooms: RoomEntity[],
    bookings: BookingEntity[],
  ) {
    if (!rooms.length) {
      return 0;
    }

    const revenueRoomIds = new Set(bookings.map((booking) => booking.room.id));
    return Math.round(
      rooms.reduce(
        (sum, room) => sum + (revenueRoomIds.has(room.id) ? 72 : 48),
        0,
      ) / rooms.length,
    );
  }
}

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

function calculateNightCount(checkInDate: string, checkOutDate: string) {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  return Math.max(
    1,
    Math.round(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );
}

function mapRoomImage(image: RoomImageEntity) {
  return {
    id: image.id,
    name: image.altText ?? 'Room image',
    url: image.url,
    s3Key: image.s3Key,
    contentType: image.contentType ?? undefined,
    sizeBytes: image.sizeBytes ? Number(image.sizeBytes) : undefined,
    altText: image.altText ?? undefined,
    isCover: image.isCover,
    sortOrder: image.sortOrder,
  };
}

function aggregateRevenueTimeline(
  bookings: BookingEntity[],
  range: '30d' | '90d' | '180d',
) {
  const monthMap = new Map<
    string,
    { month: string; revenue: number; bookings: number; occupancy: number }
  >();

  for (const booking of bookings) {
    const monthKey = `Th${new Date(booking.createdAt).getMonth() + 1}`;
    const current = monthMap.get(monthKey) ?? {
      month: monthKey,
      revenue: 0,
      bookings: 0,
      occupancy: 0,
    };

    if (booking.paymentStatus === 'PAID') {
      current.revenue += Number(booking.totalAmount);
    }

    current.bookings += 1;
    current.occupancy = Math.min(95, current.bookings * 9 + 18);
    monthMap.set(monthKey, current);
  }

  const items = Array.from(monthMap.values());

  if (range === '30d') {
    return items.slice(-3);
  }

  if (range === '90d') {
    return items.slice(-4);
  }

  return items.slice(-6);
}

function toAmenityCode(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}
