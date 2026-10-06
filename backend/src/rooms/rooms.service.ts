import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingAvailabilityService } from '../bookings/booking-availability.service';
import { successResponse } from '../common/api-response';
import { RoomEntity } from '../database/entities/room.entity';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { ListRoomsQueryDto } from './dto/list-rooms-query.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(RoomEntity)
    private readonly roomRepository: Repository<RoomEntity>,
    private readonly availabilityService: BookingAvailabilityService,
  ) {}

  async listRooms(query: ListRoomsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const queryBuilder = this.roomRepository
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.images', 'image')
      .leftJoinAndSelect('room.amenities', 'amenity')
      .where('room.status = :status', { status: 'ACTIVE' })
      .orderBy('room.featured_order', 'ASC')
      .addOrderBy('room.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.guestCount) {
      queryBuilder.andWhere('room.max_guests >= :guestCount', {
        guestCount: query.guestCount,
      });
    }

    const [rooms, total] = await queryBuilder.getManyAndCount();
    const items = rooms.map((room) => this.toPublicRoomCard(room));

    return successResponse({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  }

  async getRoomDetail(slug: string) {
    const room = await this.roomRepository.findOne({
      where: { slug },
      relations: { images: true, amenities: true },
    });

    if (!room) {
      throw new NotFoundException('Không tìm thấy phòng.');
    }

    return successResponse({
      ...this.toPublicRoomDetail(room),
      bookedDateRanges: await this.availabilityService.getBookedDateRanges(
        room.id,
      ),
    });
  }

  async getAvailability(query: AvailabilityQueryDto) {
    await this.availabilityService.cleanupExpiredPendingBookings();
    const { nightCount } = this.availabilityService.validateDateRange(
      query.checkInDate,
      query.checkOutDate,
    );

    const queryBuilder = this.roomRepository
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.images', 'image')
      .leftJoinAndSelect('room.amenities', 'amenity')
      .where('room.status = :status', { status: 'ACTIVE' })
      .andWhere('room.max_guests >= :guestCount', {
        guestCount: query.guestCount,
      })
      .orderBy('room.featured_order', 'ASC');

    if (query.roomType) {
      queryBuilder.andWhere('room.room_type = :roomType', {
        roomType: query.roomType,
      });
    }

    const rooms = await queryBuilder.getMany();
    const items: Array<{
      roomId: string;
      slug: string;
      name: string;
      roomType: string;
      subtitle: string;
      shortDescription: string;
      heroImage: string;
      cardImage: string;
      available: boolean;
      nightCount: number;
      pricePerNight: number;
      totalAmount: number;
      maxGuests: number;
      size: string;
      bedInfo: string;
      features: string[];
      atmosphere: string[];
    }> = [];

    for (const room of rooms) {
      const available = await this.availabilityService.isRoomAvailable(
        room.id,
        query.checkInDate,
        query.checkOutDate,
      );

      if (!available) {
        continue;
      }

      items.push({
        roomId: room.id,
        slug: room.slug,
        name: room.name,
        roomType: room.roomType,
        subtitle: room.shortDescription ?? '',
        shortDescription: room.shortDescription ?? '',
        heroImage: room.heroImageUrl ?? '',
        cardImage: room.cardImageUrl ?? '',
        available,
        nightCount,
        pricePerNight: Number(room.pricePerNight),
        totalAmount: Number(room.pricePerNight) * nightCount,
        maxGuests: room.maxGuests,
        size: `${room.sizeSqm}m²`,
        bedInfo: room.bedInfo ?? '',
        features: parseList(room.featureTags),
        atmosphere: parseList(room.atmosphereTags),
      });
    }

    return successResponse(items);
  }

  private toPublicRoomCard(room: RoomEntity) {
    return {
      id: room.id,
      slug: room.slug,
      name: room.name,
      roomType: room.roomType,
      subtitle: room.shortDescription ?? '',
      shortDescription: room.shortDescription ?? '',
      description: room.description,
      heroImage: room.heroImageUrl ?? '',
      cardImage: room.cardImageUrl ?? '',
      pricePerNight: Number(room.pricePerNight),
      maxGuests: room.maxGuests,
      size: `${room.sizeSqm}m²`,
      bedInfo: room.bedInfo ?? '',
      highlight: room.highlightText ?? '',
      features: parseList(room.featureTags),
      amenities: room.amenities.map((amenity) => amenity.name),
      atmosphere: parseList(room.atmosphereTags),
      checkIn: room.checkInTime,
      checkOut: room.checkOutTime,
    };
  }

  private toPublicRoomDetail(room: RoomEntity) {
    return {
      ...this.toPublicRoomCard(room),
      sizeSqm: room.sizeSqm,
      bedroomCount: room.bedroomCount,
      bedCount: room.bedCount,
      bathroomCount: room.bathroomCount,
      status: room.status,
      images: [...room.images]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((item) => ({
          id: item.id,
          title: item.altText ?? room.name,
          url: item.url,
          altText: item.altText ?? room.name,
          isCover: item.isCover,
          sortOrder: item.sortOrder,
        })),
      gallery: [...room.images]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((item) => ({
          title: item.altText ?? room.name,
          image: item.url,
        })),
    };
  }
}

function parseList(value: string | null) {
  return value ? value.split('|').filter(Boolean) : [];
}
