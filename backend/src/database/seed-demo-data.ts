import 'dotenv/config';
import { DataSource } from 'typeorm';
import { AmenityEntity } from './entities/amenity.entity';
import { BookingEntity } from './entities/booking.entity';
import { RoomImageEntity } from './entities/room-image.entity';
import { RoomEntity } from './entities/room.entity';
import { getTypeOrmOptions } from './typeorm.config';

const demoRooms = [
  ['lotus-garden', 'Lotus Garden', 'SUITE', 1120000, 2, 34, '1 giường queen', 'Khoảng sân nhỏ, nhiều ánh sáng và sắc xanh dịu.'],
  ['imperial-balcony', 'Imperial Balcony', 'DELUXE', 940000, 2, 29, '1 giường queen', 'Ban công riêng nhìn ra mái ngói và nhịp sống phố Huế.'],
  ['perfume-river-loft', 'Perfume River Loft', 'LOFT', 1480000, 3, 48, '1 giường king', 'Không gian mở với góc đọc sách và cửa sổ rộng.'],
  ['citadel-family', 'Citadel Family', 'FAMILY', 1760000, 4, 56, '2 giường đôi', 'Phòng gia đình thoáng sáng, bố trí tiện lợi cho nhóm nhỏ.'],
  ['moonlight-studio', 'Moonlight Studio', 'STUDIO', 820000, 2, 26, '1 giường đôi', 'Studio tinh gọn với bàn làm việc và ánh đèn ấm.'],
  ['garden-courtyard', 'Garden Courtyard', 'DELUXE', 1050000, 2, 32, '1 giường queen', 'Sân trong yên tĩnh, phù hợp kỳ nghỉ chậm rãi.'],
  ['heritage-suite', 'Heritage Suite', 'SUITE', 1620000, 3, 51, '1 giường king', 'Chất liệu gỗ ấm và không gian sinh hoạt riêng.'],
  ['family-riverside', 'Family Riverside', 'FAMILY', 1890000, 5, 62, '2 giường queen', 'Căn phòng rộng cho gia đình, có góc sinh hoạt chung.'],
  ['terrace-retreat', 'Terrace Retreat', 'SUITE', 1350000, 2, 42, '1 giường king', 'Khu vực hiên thoáng và bảng màu tự nhiên thư thái.'],
] as const;

const imageIds = [
  'photo-1611892440504-42a792e24d32',
  'photo-1618221195710-dd6b41faaea6',
  'photo-1616486338812-3dadae4b4ace',
];

async function seedDemoData() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to seed local demo data.');
  }

  const database = new URL(databaseUrl);
  if (!['localhost', '127.0.0.1', '::1'].includes(database.hostname) ||
      database.pathname !== '/oni-homestay') {
    throw new Error('Demo data is restricted to the local oni-homestay database.');
  }

  const options = getTypeOrmOptions();
  if (options.type !== 'postgres') {
    throw new Error('Demo data seeding requires the local PostgreSQL database.');
  }

  const dataSource = new DataSource({ ...options, migrationsRun: false });
  await dataSource.initialize();
  try {
    const result = await dataSource.transaction(async (manager) => {
      const roomRepository = manager.getRepository(RoomEntity);
      const amenityRepository = manager.getRepository(AmenityEntity);
      const bookingRepository = manager.getRepository(BookingEntity);
      const roomAmenities = await Promise.all(
        ['Wi-Fi tốc độ cao', 'Máy lạnh', 'Bữa sáng nhẹ', 'Nước lọc miễn phí'].map(
          async (name) => {
            const code = toAmenityCode(name);
            const existing = await amenityRepository.findOneBy({ code });
            return existing ?? amenityRepository.save(amenityRepository.create({
              code,
              name,
              icon: null,
            }));
          },
        ),
      );

      const savedRooms: RoomEntity[] = [];
      for (const [index, room] of demoRooms.entries()) {
        const existing = await roomRepository.findOneBy({ slug: room[0] });
        if (existing) continue;
        const images = imageIds.map((imageId, imageIndex) => {
          const image = new RoomImageEntity();
          image.s3Key = `demo/${room[0]}/${imageIndex + 1}.jpg`;
          image.url = `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=1200&q=80`;
          image.contentType = 'image/jpeg';
          image.sizeBytes = null;
          image.altText = `${room[1]} · ${imageIndex + 1}`;
          image.sortOrder = imageIndex + 1;
          image.isCover = imageIndex === 0;
          return image;
        });
        const created = roomRepository.create({
          slug: room[0],
          name: room[1],
          roomType: room[2],
          shortDescription: room[6],
          description: `${room[1]} mang đến không gian nghỉ ngơi sáng sủa, tiện nghi và gần gũi với nhịp sống Huế. ${room[6]}`,
          pricePerNight: String(room[3]),
          maxGuests: room[4],
          bedroomCount: 1,
          bedCount: room[2] === 'FAMILY' ? 2 : 1,
          bathroomCount: room[2] === 'FAMILY' ? 2 : 1,
          sizeSqm: room[5],
          featuredOrder: 10 + index,
          status: 'ACTIVE',
          checkInTime: '14:00',
          checkOutTime: '12:00',
          heroImageUrl: images[0].url,
          cardImageUrl: images[0].url,
          highlightText: room[6],
          bedInfo: room[2] === 'FAMILY' ? '2 giường đôi' : '1 giường queen',
          atmosphereTags: 'Ấm áp|Thư thái',
          featureTags: 'Ánh sáng tự nhiên|Không gian riêng tư|Nội thất tiện nghi',
          password: null,
          amenities: roomAmenities.slice(0, 3 + (index % 2)),
          images,
        });
        savedRooms.push(await roomRepository.save(created));
      }

      const allDemoRooms = await roomRepository.find({
        where: demoRooms.map(([slug]) => ({ slug })),
        order: { slug: 'ASC' },
      });
      const roomBySlug = new Map(allDemoRooms.map((room) => [room.slug, room]));
      let bookingsCreated = 0;
      for (let month = 3; month <= 8; month += 1) {
        for (const [index, roomFixture] of demoRooms.entries()) {
          const bookingCode = `ONI-DEMO-2026${String(month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`;
          if (await bookingRepository.findOneBy({ bookingCode })) continue;
          const room = roomBySlug.get(roomFixture[0]);
          if (!room) throw new Error(`Demo room "${roomFixture[0]}" could not be loaded.`);

          const nights = 1 + ((month + index) % 3);
          const totalAmount = Number(room.pricePerNight) * nights;
          const createdAt = new Date(Date.UTC(2026, month - 1, 2 + index, 9));
          const checkIn = new Date(Date.UTC(2026, month - 1, 10 + (index % 10)));
          const checkOut = new Date(checkIn.getTime() + nights * 86_400_000);
          const paymentStatus = (month + index) % 6 === 0
            ? 'REFUNDED'
            : (month + index) % 6 === 1 ? 'UNPAID' : 'PAID';
          const status = paymentStatus === 'UNPAID'
            ? 'PENDING_PAYMENT'
            : paymentStatus === 'REFUNDED' ? 'REFUNDED' : 'CHECKED_OUT';
          await bookingRepository.save(bookingRepository.create({
            bookingCode,
            user: null,
            room,
            bookingSource: 'GUEST_CHECKOUT',
            guestName: `Khách kiểm thử ${String(index + 1).padStart(2, '0')}`,
            guestEmail: `demo.guest.${String(index + 1).padStart(2, '0')}@example.test`,
            guestPhone: `09000000${String(index + 1).padStart(2, '0')}`,
            checkInDate: checkIn.toISOString().slice(0, 10),
            checkOutDate: checkOut.toISOString().slice(0, 10),
            guestCount: Math.min(room.maxGuests, 1 + (index % room.maxGuests)),
            roomPriceSnapshot: String(room.pricePerNight),
            totalAmount: String(totalAmount),
            status,
            paymentStatus,
            note: 'Dữ liệu demo để kiểm tra dashboard.',
            holdExpiresAt: null,
            confirmedAt: paymentStatus === 'PAID' ? createdAt : null,
            cancelledAt: null,
            refundedAt: paymentStatus === 'REFUNDED' ? createdAt : null,
            createdAt,
            updatedAt: createdAt,
          }));
          bookingsCreated += 1;
        }
      }

      return { roomsCreated: savedRooms.length, bookingsCreated };
    });
    console.log(JSON.stringify({ ...result, demoRooms: demoRooms.length }));
  } finally {
    await dataSource.destroy();
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

void seedDemoData().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unable to seed demo data.');
  process.exitCode = 1;
});
