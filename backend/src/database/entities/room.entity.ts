import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AmenityEntity } from './amenity.entity';
import { RoomImageEntity } from './room-image.entity';

@Entity({ name: 'rooms' })
export class RoomEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 160, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ name: 'room_type', type: 'varchar', length: 50 })
  roomType!: string;

  @Column({
    name: 'short_description',
    type: 'varchar',
    length: 300,
    nullable: true,
  })
  shortDescription!: string | null;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'price_per_night', type: 'decimal', precision: 12, scale: 2 })
  pricePerNight!: string;

  @Column({ name: 'max_guests', type: 'int' })
  maxGuests!: number;

  @Column({ name: 'bedroom_count', type: 'int', default: 1 })
  bedroomCount!: number;

  @Column({ name: 'bed_count', type: 'int', default: 1 })
  bedCount!: number;

  @Column({ name: 'bathroom_count', type: 'int', default: 1 })
  bathroomCount!: number;

  @Column({ name: 'size_sqm', type: 'int' })
  sizeSqm!: number;

  @Column({ name: 'featured_order', type: 'int', default: 0 })
  featuredOrder!: number;

  @Column({ type: 'varchar', length: 30, default: 'ACTIVE' })
  status!: string;

  @Column({
    name: 'check_in_time',
    type: 'varchar',
    length: 10,
    default: '14:00',
  })
  checkInTime!: string;

  @Column({
    name: 'check_out_time',
    type: 'varchar',
    length: 10,
    default: '12:00',
  })
  checkOutTime!: string;

  @Column({
    name: 'hero_image_url',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  heroImageUrl!: string | null;

  @Column({
    name: 'card_image_url',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  cardImageUrl!: string | null;

  @Column({
    name: 'highlight_text',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  highlightText!: string | null;

  @Column({ name: 'bed_info', type: 'varchar', length: 120, nullable: true })
  bedInfo!: string | null;

  @Column({ name: 'atmosphere_tags', type: 'text', nullable: true })
  atmosphereTags!: string | null;

  @Column({ name: 'feature_tags', type: 'text', nullable: true })
  featureTags!: string | null;

  @Column({ name: 'password', type: 'varchar', length: 100, nullable: true })
  password!: string | null;

  @OneToMany(() => RoomImageEntity, (image) => image.room, { cascade: true })
  images!: RoomImageEntity[];

  @ManyToMany(() => AmenityEntity, (amenity) => amenity.rooms)
  @JoinTable({
    name: 'room_amenities',
    joinColumn: { name: 'room_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'amenity_id', referencedColumnName: 'id' },
  })
  amenities!: AmenityEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
