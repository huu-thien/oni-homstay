import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingEntity } from './booking.entity';

@Entity({ name: 'payments' })
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BookingEntity, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: true,
  })
  @JoinColumn({ name: 'booking_id' })
  booking!: BookingEntity;

  @Column({ type: 'varchar', length: 40 })
  provider!: string;

  @Column({
    name: 'provider_order_id',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  providerOrderId!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'varchar', length: 30, default: 'PENDING' })
  status!: string;

  @Column({
    name: 'checkout_url',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  checkoutUrl!: string | null;

  @Column({
    name: 'qr_code_url',
    type: 'varchar',
    length: 1200,
    nullable: true,
  })
  qrCodeUrl!: string | null;

  @Column({
    name: 'provider_transaction_id',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  providerTransactionId!: string | null;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @Column({
    name: 'failure_reason',
    type: 'varchar',
    length: 300,
    nullable: true,
  })
  failureReason!: string | null;

  @Column({ name: 'provider_payload', type: 'text', nullable: true })
  providerPayload!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
