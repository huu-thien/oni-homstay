export type SeedRoom = {
  id: string;
  slug: string;
  name: string;
  roomType: string;
  subtitle: string;
  shortDescription: string;
  description: string;
  heroImage: string;
  cardImage: string;
  pricePerNight: number;
  maxGuests: number;
  size: string;
  sizeSqm: number;
  bedInfo: string;
  highlight: string;
  features: string[];
  amenities: string[];
  gallery: {
    title: string;
    image: string;
  }[];
  atmosphere: string[];
  checkIn: string;
  checkOut: string;
  bedroomCount: number;
  bedCount: number;
  bathroomCount: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  password?: string;
};

export type SeedUser = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  status: 'ACTIVE' | 'PENDING_ACTIVATION' | 'SUSPENDED';
};

export type SeedBooking = {
  bookingCode: string;
  roomSlug: string;
  userEmail?: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  totalAmount: number;
  bookingSource: 'GUEST_CHECKOUT' | 'CUSTOMER_ACCOUNT';
  status:
    | 'PENDING_PAYMENT'
    | 'CONFIRMED'
    | 'CHECKED_IN'
    | 'CHECKED_OUT'
    | 'CANCELLED'
    | 'REFUNDED';
  paymentStatus: 'PAID' | 'UNPAID' | 'REFUNDED';
  createdAt: string;
  note?: string;
};

export const mockRooms: SeedRoom[] = [
  {
    id: 'room-1',
    slug: 'garden-suite',
    name: 'Garden Suite',
    roomType: 'SUITE',
    password: 'ONI-GARDEN-101',
    subtitle: 'Yên tĩnh, ngập nắng và nhìn ra khoảng xanh riêng',
    shortDescription:
      'Phòng suite tông kem - mận tím với sân vườn riêng và góc trà chiều dịu.',
    description:
      'Garden Suite là lựa chọn cân bằng giữa nghỉ dưỡng và riêng tư. Không gian dùng bảng màu kem ấm, gỗ nâu và nhấn tím Huế nhẹ, phù hợp cho cặp đôi hoặc khách muốn chậm lại giữa thành phố.',
    heroImage:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80',
    cardImage:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    pricePerNight: 980000,
    maxGuests: 2,
    size: '38m²',
    sizeSqm: 38,
    bedInfo: '1 giường queen',
    highlight: 'Khoảng hiên riêng, ánh sáng chiều đẹp và khu trà nhỏ.',
    features: [
      'Ban công riêng',
      'Bồn tắm đứng',
      'Góc trà chiều',
      'Ánh sáng tự nhiên',
    ],
    amenities: [
      'Wi-Fi tốc độ cao',
      'Máy lạnh',
      'Bữa sáng nhẹ',
      'Nước lọc miễn phí',
      'Máy sấy tóc',
      'Khóa cửa thông minh',
    ],
    gallery: [
      {
        title: 'Hiên riêng ngập nắng',
        image:
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
      },
      {
        title: 'Góc ngủ tông kem',
        image:
          'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
      },
      {
        title: 'Bàn trà cạnh cửa sổ',
        image:
          'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
      },
      {
        title: 'Phòng tắm tối giản',
        image:
          'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80',
      },
    ],
    atmosphere: ['Dịu', 'Ấm', 'Riêng tư'],
    checkIn: '14:00',
    checkOut: '12:00',
    bedroomCount: 1,
    bedCount: 1,
    bathroomCount: 1,
    status: 'ACTIVE',
  },
  {
    id: 'room-2',
    slug: 'river-deluxe',
    name: 'River Deluxe',
    roomType: 'DELUXE',
    password: 'ONI-RIVER-202',
    subtitle: 'Phòng đôi với cảm giác thoáng, mềm và rất “Huế”',
    shortDescription:
      'Không gian dành cho 2 khách với sắc rêu dịu, điểm nhấn ánh vàng và tường kem.',
    description:
      'River Deluxe mang tinh thần hiện đại nhưng vẫn mềm mại. Phòng có layout thoáng, nội thất tinh gọn, phù hợp cho khách thích sự nhẹ nhàng và ưu tiên trải nghiệm đẹp khi lưu trú ngắn ngày.',
    heroImage:
      'https://images.unsplash.com/photo-1505693538694-c2c4d7c2d7f1?auto=format&fit=crop&w=1600&q=80',
    cardImage:
      'https://images.unsplash.com/photo-1505693538694-c2c4d7c2d7f1?auto=format&fit=crop&w=1200&q=80',
    pricePerNight: 860000,
    maxGuests: 2,
    size: '30m²',
    sizeSqm: 30,
    bedInfo: '1 giường queen',
    highlight: 'Bảng màu xanh rêu dịu, ánh đèn ấm và layout rất gọn.',
    features: ['Cửa sổ lớn', 'Góc đọc sách', 'Ánh sáng ấm', 'Bàn làm việc nhỏ'],
    amenities: [
      'Wi-Fi tốc độ cao',
      'Máy lạnh',
      'TV thông minh',
      'Minibar',
      'Dép đi trong phòng',
      'Sữa tắm thiên nhiên',
    ],
    gallery: [
      {
        title: 'Cửa sổ lớn đón sáng',
        image:
          'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
      },
      {
        title: 'Giường đôi tối giản',
        image:
          'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
      },
      {
        title: 'Góc làm việc nhỏ',
        image:
          'https://images.unsplash.com/photo-1486946255434-2466348c2166?auto=format&fit=crop&w=1200&q=80',
      },
      {
        title: 'Phòng tắm tinh gọn',
        image:
          'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      },
    ],
    atmosphere: ['Sạch', 'Thoáng', 'Nhẹ'],
    checkIn: '14:00',
    checkOut: '12:00',
    bedroomCount: 1,
    bedCount: 1,
    bathroomCount: 1,
    status: 'ACTIVE',
  },
  {
    id: 'room-3',
    slug: 'attic-family',
    name: 'Attic Family',
    roomType: 'FAMILY',
    password: 'ONI-ATTIC-303',
    subtitle: 'Ấm áp, tiện nghi và phù hợp nhóm bạn nhỏ hoặc gia đình',
    shortDescription:
      'Căn phòng áp mái có 2 giường, bảng màu gỗ ấm và nhiều tiện ích thực dụng.',
    description:
      'Attic Family ưu tiên cảm giác ấm cúng và linh hoạt. Phòng phù hợp nhóm 3-4 khách muốn ở cùng nhau nhưng vẫn có sự thoải mái, sáng sủa và đủ tiện nghi cho kỳ nghỉ ngắn.',
    heroImage:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80',
    cardImage:
      'https://images.unsplash.com/photo-1505693426420-5a3c6f44e1f7?auto=format&fit=crop&w=1200&q=80',
    pricePerNight: 1280000,
    maxGuests: 4,
    size: '46m²',
    sizeSqm: 46,
    bedInfo: '2 giường đôi nhỏ',
    highlight:
      'Không gian áp mái ấm cúng, nhiều khoảng lưu trữ và cực hợp nhóm nhỏ.',
    features: [
      '2 giường đôi nhỏ',
      'Bàn ăn mini',
      'Cửa sổ mái',
      'Kệ hành lý rộng',
    ],
    amenities: [
      'Wi-Fi tốc độ cao',
      'Máy lạnh',
      'Bữa sáng nhẹ',
      'Tủ lạnh mini',
      'Nước nóng',
      'Bàn ăn nhỏ',
    ],
    gallery: [
      {
        title: 'Không gian áp mái',
        image:
          'https://images.unsplash.com/photo-1486304873000-235643847519?auto=format&fit=crop&w=1200&q=80',
      },
      {
        title: '2 giường gọn gàng',
        image:
          'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
      },
      {
        title: 'Bàn ăn mini',
        image:
          'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
      },
      {
        title: 'Góc cửa sổ mái',
        image:
          'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
      },
    ],
    atmosphere: ['Ấm', 'Thực dụng', 'Thoải mái'],
    checkIn: '14:00',
    checkOut: '12:00',
    bedroomCount: 1,
    bedCount: 2,
    bathroomCount: 1,
    status: 'ACTIVE',
  },
];

export const seedUsers: SeedUser[] = [
  {
    fullName: 'Nguyen Minh Anh',
    email: 'minhanh@gmail.com',
    phone: '0909123456',
    password: 'Customer@123',
    role: 'CUSTOMER',
    status: 'ACTIVE',
  },
  {
    fullName: 'Tran Bao Chau',
    email: 'baochau@gmail.com',
    phone: '0911222333',
    password: 'Customer@123',
    role: 'CUSTOMER',
    status: 'PENDING_ACTIVATION',
  },
  {
    fullName: 'Le Thu Ha',
    email: 'thuha@onihomstay.vn',
    phone: '0908777666',
    password: 'Staff@123',
    role: 'STAFF',
    status: 'ACTIVE',
  },
  {
    fullName: 'Admin O ni',
    email: 'admin@onihomstay.vn',
    phone: '0909000000',
    password: 'Admin@123',
    role: 'ADMIN',
    status: 'ACTIVE',
  },
];

export const seedBookings: SeedBooking[] = [
  {
    bookingCode: 'ONI240201',
    roomSlug: 'garden-suite',
    userEmail: 'minhanh@gmail.com',
    guestName: 'Nguyen Minh Anh',
    guestEmail: 'minhanh@gmail.com',
    guestPhone: '0909123456',
    checkInDate: '2026-02-14',
    checkOutDate: '2026-02-16',
    guestCount: 2,
    totalAmount: 1960000,
    bookingSource: 'CUSTOMER_ACCOUNT',
    status: 'CHECKED_OUT',
    paymentStatus: 'PAID',
    createdAt: '2026-02-10T09:00:00.000Z',
  },
  {
    bookingCode: 'ONI240301',
    roomSlug: 'river-deluxe',
    userEmail: 'baochau@gmail.com',
    guestName: 'Tran Bao Chau',
    guestEmail: 'baochau@gmail.com',
    guestPhone: '0911222333',
    checkInDate: '2026-03-08',
    checkOutDate: '2026-03-10',
    guestCount: 2,
    totalAmount: 1720000,
    bookingSource: 'CUSTOMER_ACCOUNT',
    status: 'CHECKED_OUT',
    paymentStatus: 'PAID',
    createdAt: '2026-03-01T09:00:00.000Z',
  },
  {
    bookingCode: 'ONI240401',
    roomSlug: 'attic-family',
    guestName: 'Pham Gia Huy',
    guestEmail: 'giahuy@gmail.com',
    guestPhone: '0908666888',
    checkInDate: '2026-04-20',
    checkOutDate: '2026-04-22',
    guestCount: 4,
    totalAmount: 2560000,
    bookingSource: 'GUEST_CHECKOUT',
    status: 'CHECKED_OUT',
    paymentStatus: 'PAID',
    createdAt: '2026-04-12T09:00:00.000Z',
  },
  {
    bookingCode: 'ONI240501',
    roomSlug: 'garden-suite',
    guestName: 'Hoang Lan',
    guestEmail: 'hoanglan@gmail.com',
    guestPhone: '0908111222',
    checkInDate: '2026-05-04',
    checkOutDate: '2026-05-06',
    guestCount: 2,
    totalAmount: 1960000,
    bookingSource: 'GUEST_CHECKOUT',
    status: 'CHECKED_OUT',
    paymentStatus: 'PAID',
    createdAt: '2026-05-01T09:00:00.000Z',
  },
  {
    bookingCode: 'ONI240601',
    roomSlug: 'river-deluxe',
    guestName: 'Do Khanh Linh',
    guestEmail: 'khanhlinh@gmail.com',
    guestPhone: '0907000001',
    checkInDate: '2026-06-18',
    checkOutDate: '2026-06-20',
    guestCount: 2,
    totalAmount: 1720000,
    bookingSource: 'GUEST_CHECKOUT',
    status: 'CHECKED_OUT',
    paymentStatus: 'PAID',
    createdAt: '2026-06-12T09:00:00.000Z',
  },
  {
    bookingCode: 'ONI240701',
    roomSlug: 'garden-suite',
    userEmail: 'minhanh@gmail.com',
    guestName: 'Nguyen Minh Anh',
    guestEmail: 'minhanh@gmail.com',
    guestPhone: '0909123456',
    checkInDate: '2026-07-26',
    checkOutDate: '2026-07-28',
    guestCount: 2,
    totalAmount: 1960000,
    bookingSource: 'CUSTOMER_ACCOUNT',
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    createdAt: '2026-07-20T09:00:00.000Z',
  },
  {
    bookingCode: 'ONI240702',
    roomSlug: 'river-deluxe',
    userEmail: 'baochau@gmail.com',
    guestName: 'Tran Bao Chau',
    guestEmail: 'baochau@gmail.com',
    guestPhone: '0911222333',
    checkInDate: '2026-07-29',
    checkOutDate: '2026-07-31',
    guestCount: 2,
    totalAmount: 1720000,
    bookingSource: 'CUSTOMER_ACCOUNT',
    status: 'PENDING_PAYMENT',
    paymentStatus: 'UNPAID',
    createdAt: '2026-07-21T09:00:00.000Z',
  },
  {
    bookingCode: 'ONI240703',
    roomSlug: 'attic-family',
    guestName: 'Pham Gia Huy',
    guestEmail: 'giahuy@gmail.com',
    guestPhone: '0908666888',
    checkInDate: '2026-08-01',
    checkOutDate: '2026-08-03',
    guestCount: 4,
    totalAmount: 2560000,
    bookingSource: 'GUEST_CHECKOUT',
    status: 'CHECKED_IN',
    paymentStatus: 'PAID',
    createdAt: '2026-07-19T09:00:00.000Z',
  },
  {
    bookingCode: 'ONI240704',
    roomSlug: 'garden-suite',
    guestName: 'Hoang Lan',
    guestEmail: 'hoanglan@gmail.com',
    guestPhone: '0908111222',
    checkInDate: '2026-08-04',
    checkOutDate: '2026-08-05',
    guestCount: 2,
    totalAmount: 980000,
    bookingSource: 'GUEST_CHECKOUT',
    status: 'CHECKED_OUT',
    paymentStatus: 'PAID',
    createdAt: '2026-07-18T09:00:00.000Z',
  },
  {
    bookingCode: 'ONI240705',
    roomSlug: 'river-deluxe',
    guestName: 'Do Khanh Linh',
    guestEmail: 'khanhlinh@gmail.com',
    guestPhone: '0907000001',
    checkInDate: '2026-08-06',
    checkOutDate: '2026-08-08',
    guestCount: 2,
    totalAmount: 1720000,
    bookingSource: 'GUEST_CHECKOUT',
    status: 'CANCELLED',
    paymentStatus: 'UNPAID',
    createdAt: '2026-07-22T09:00:00.000Z',
  },
];
