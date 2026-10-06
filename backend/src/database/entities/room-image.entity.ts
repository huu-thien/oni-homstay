import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RoomEntity } from './room.entity';

@Entity({ name: 'room_images' })
export class RoomImageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => RoomEntity, (room) => room.images, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'room_id' })
  room!: RoomEntity;

  @Column({ name: 's3_key', type: 'varchar', length: 500 })
  s3Key!: string;

  @Column({ type: 'varchar', length: 1000 })
  url!: string;

  @Column({
    name: 'content_type',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  contentType!: string | null;

  @Column({ name: 'size_bytes', type: 'bigint', nullable: true })
  sizeBytes!: string | null;

  @Column({ name: 'alt_text', type: 'varchar', length: 255, nullable: true })
  altText!: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_cover', type: 'boolean', default: false })
  isCover!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
