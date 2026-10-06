import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentEntity } from './payment.entity';

@Entity({ name: 'payment_events' })
export class PaymentEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PaymentEntity, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: true,
  })
  @JoinColumn({ name: 'payment_id' })
  payment!: PaymentEntity;

  @Column({ type: 'varchar', length: 40 })
  provider!: string;

  @Column({
    name: 'provider_event_id',
    type: 'varchar',
    length: 120,
    unique: true,
  })
  providerEventId!: string;

  @Column({ type: 'varchar', length: 30 })
  status!: string;

  @Column({
    name: 'signature_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  signatureHash!: string | null;

  @Column({ type: 'text' })
  payload!: string;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
