import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity({ name: 'password_reset_tokens' })
export class PasswordResetTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, (user) => user.passwordResetTokens, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 255, unique: true })
  token!: string;

  @Column({ name: 'expires_at', type: 'varchar', length: 40 })
  expiresAt!: string;

  @Column({ name: 'used_at', type: 'varchar', length: 40, nullable: true })
  usedAt!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
