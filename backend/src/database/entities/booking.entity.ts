import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoomEntity } from './room.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'bookings' })
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booking_code', type: 'varchar', length: 30, unique: true })
  bookingCode!: string;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity | null;

  @ManyToOne(() => RoomEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
    eager: true,
  })
  @JoinColumn({ name: 'room_id' })
  room!: RoomEntity;

  @Column({
    name: 'booking_source',
    type: 'varchar',
    length: 30,
    default: 'GUEST_CHECKOUT',
  })
  bookingSource!: string;

  @Column({ name: 'guest_name', type: 'varchar', length: 150 })
  guestName!: string;

  @Column({ name: 'guest_email', type: 'varchar', length: 255, nullable: true })
  guestEmail!: string | null;

  @Column({ name: 'guest_phone', type: 'varchar', length: 20, nullable: true })
  guestPhone!: string | null;

  @Column({ name: 'check_in_date', type: 'date' })
  checkInDate!: string;

  @Column({ name: 'check_out_date', type: 'date' })
  checkOutDate!: string;

  @Column({ name: 'guest_count', type: 'int' })
  guestCount!: number;

  @Column({
    name: 'room_price_snapshot',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  roomPriceSnapshot!: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount!: string;

  @Column({ type: 'varchar', length: 30 })
  status!: string;

  @Column({
    name: 'payment_status',
    type: 'varchar',
    length: 30,
    default: 'UNPAID',
  })
  paymentStatus!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'hold_expires_at', type: 'timestamp', nullable: true })
  holdExpiresAt!: Date | null;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'refunded_at', type: 'timestamp', nullable: true })
  refundedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
