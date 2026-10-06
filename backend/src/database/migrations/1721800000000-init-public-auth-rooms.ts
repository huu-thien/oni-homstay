import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class InitPublicAuthRooms1721800000000 implements MigrationInterface {
  name = 'InitPublicAuthRooms1721800000000';

  private getIdType(queryRunner: QueryRunner) {
    return queryRunner.connection.options.type === 'postgres'
      ? 'uuid'
      : 'varchar';
  }

  private getIdColumn(queryRunner: QueryRunner) {
    return {
      name: 'id',
      type: this.getIdType(queryRunner),
      length:
        queryRunner.connection.options.type === 'postgres' ? undefined : '36',
      isPrimary: true,
      isGenerated: true,
      generationStrategy: 'uuid' as const,
    };
  }

  private getDateTimeType(queryRunner: QueryRunner) {
    return queryRunner.connection.options.type === 'postgres'
      ? 'timestamp'
      : 'datetime';
  }

  private getNowDefault(queryRunner: QueryRunner) {
    return queryRunner.connection.options.type === 'postgres'
      ? 'now()'
      : "datetime('now')";
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          this.getIdColumn(queryRunner),
          {
            name: 'code',
            type: 'varchar',
            length: '50',
            isUnique: true,
            isNullable: false,
          },
          { name: 'name', type: 'varchar', length: '100', isNullable: false },
          {
            name: 'created_at',
            type: this.getDateTimeType(queryRunner),
            default: this.getNowDefault(queryRunner),
          },
          {
            name: 'updated_at',
            type: this.getDateTimeType(queryRunner),
            default: this.getNowDefault(queryRunner),
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          this.getIdColumn(queryRunner),
          {
            name: 'role_id',
            type: this.getIdType(queryRunner),
            isNullable: false,
          },
          {
            name: 'full_name',
            type: 'varchar',
            length: '150',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: false,
            isUnique: true,
          },
          { name: 'password_hash', type: 'text', isNullable: false },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
            default: "'ACTIVE'",
          },
          {
            name: 'created_at',
            type: this.getDateTimeType(queryRunner),
            default: this.getNowDefault(queryRunner),
          },
          {
            name: 'updated_at',
            type: this.getDateTimeType(queryRunner),
            default: this.getNowDefault(queryRunner),
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['role_id'],
            referencedTableName: 'roles',
            referencedColumnNames: ['id'],
            onDelete: 'NO ACTION',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'password_reset_tokens',
        columns: [
          this.getIdColumn(queryRunner),
          {
            name: 'user_id',
            type: this.getIdType(queryRunner),
            isNullable: false,
          },
          {
            name: 'token',
            type: 'varchar',
            length: '255',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'expires_at',
            type: 'varchar',
            length: '40',
            isNullable: false,
          },
          { name: 'used_at', type: 'varchar', length: '40', isNullable: true },
          {
            name: 'created_at',
            type: this.getDateTimeType(queryRunner),
            default: this.getNowDefault(queryRunner),
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'rooms',
        columns: [
          this.getIdColumn(queryRunner),
          {
            name: 'slug',
            type: 'varchar',
            length: '160',
            isUnique: true,
            isNullable: false,
          },
          { name: 'name', type: 'varchar', length: '160', isNullable: false },
          {
            name: 'room_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'short_description',
            type: 'varchar',
            length: '300',
            isNullable: true,
          },
          { name: 'description', type: 'text', isNullable: false },
          {
            name: 'price_per_night',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          { name: 'max_guests', type: 'int', isNullable: false },
          { name: 'bedroom_count', type: 'int', default: 1 },
          { name: 'bed_count', type: 'int', default: 1 },
          { name: 'bathroom_count', type: 'int', default: 1 },
          { name: 'size_sqm', type: 'int', isNullable: false },
          { name: 'featured_order', type: 'int', default: 0 },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
            default: "'ACTIVE'",
          },
          {
            name: 'check_in_time',
            type: 'varchar',
            length: '10',
            default: "'14:00'",
          },
          {
            name: 'check_out_time',
            type: 'varchar',
            length: '10',
            default: "'12:00'",
          },
          {
            name: 'hero_image_url',
            type: 'varchar',
            length: '1000',
            isNullable: true,
          },
          {
            name: 'card_image_url',
            type: 'varchar',
            length: '1000',
            isNullable: true,
          },
          {
            name: 'highlight_text',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'bed_info',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          { name: 'atmosphere_tags', type: 'text', isNullable: true },
          { name: 'feature_tags', type: 'text', isNullable: true },
          {
            name: 'created_at',
            type: this.getDateTimeType(queryRunner),
            default: this.getNowDefault(queryRunner),
          },
          {
            name: 'updated_at',
            type: this.getDateTimeType(queryRunner),
            default: this.getNowDefault(queryRunner),
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'room_images',
        columns: [
          this.getIdColumn(queryRunner),
          {
            name: 'room_id',
            type: this.getIdType(queryRunner),
            isNullable: false,
          },
          { name: 's3_key', type: 'varchar', length: '500', isNullable: false },
          { name: 'url', type: 'varchar', length: '1000', isNullable: false },
          {
            name: 'content_type',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          { name: 'size_bytes', type: 'bigint', isNullable: true },
          {
            name: 'alt_text',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          { name: 'sort_order', type: 'int', default: 0 },
          { name: 'is_cover', type: 'boolean', default: false },
          {
            name: 'created_at',
            type: this.getDateTimeType(queryRunner),
            default: this.getNowDefault(queryRunner),
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['room_id'],
            referencedTableName: 'rooms',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'amenities',
        columns: [
          this.getIdColumn(queryRunner),
          {
            name: 'code',
            type: 'varchar',
            length: '60',
            isUnique: true,
            isNullable: false,
          },
          { name: 'name', type: 'varchar', length: '120', isNullable: false },
          { name: 'icon', type: 'varchar', length: '120', isNullable: true },
          {
            name: 'created_at',
            type: this.getDateTimeType(queryRunner),
            default: this.getNowDefault(queryRunner),
          },
          {
            name: 'updated_at',
            type: this.getDateTimeType(queryRunner),
            default: this.getNowDefault(queryRunner),
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'room_amenities',
        columns: [
          {
            name: 'room_id',
            type: this.getIdType(queryRunner),
            isPrimary: true,
          },
          {
            name: 'amenity_id',
            type: this.getIdType(queryRunner),
            isPrimary: true,
          },
          {
            name: 'created_at',
            type: this.getDateTimeType(queryRunner),
            default: this.getNowDefault(queryRunner),
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['room_id'],
            referencedTableName: 'rooms',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['amenity_id'],
            referencedTableName: 'amenities',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'bookings',
        columns: [
          this.getIdColumn(queryRunner),
          {
            name: 'booking_code',
            type: 'varchar',
            length: '30',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'user_id',
            type: this.getIdType(queryRunner),
            isNullable: true,
          },
          {
            name: 'room_id',
            type: this.getIdType(queryRunner),
            isNullable: false,
          },
          {
            name: 'booking_source',
            type: 'varchar',
            length: '30',
            default: "'GUEST_CHECKOUT'",
          },
          {
            name: 'guest_name',
            type: 'varchar',
            length: '150',
            isNullable: false,
          },
          {
            name: 'guest_email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'guest_phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          { name: 'check_in_date', type: 'date', isNullable: false },
          { name: 'check_out_date', type: 'date', isNullable: false },
          { name: 'guest_count', type: 'int', isNullable: false },
          {
            name: 'total_amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          { name: 'status', type: 'varchar', length: '30', isNullable: false },
          {
            name: 'payment_status',
            type: 'varchar',
            length: '30',
            default: "'UNPAID'",
          },
          { name: 'note', type: 'text', isNullable: true },
          {
            name: 'created_at',
            type: this.getDateTimeType(queryRunner),
            default: this.getNowDefault(queryRunner),
          },
          {
            name: 'updated_at',
            type: this.getDateTimeType(queryRunner),
            default: this.getNowDefault(queryRunner),
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
          new TableForeignKey({
            columnNames: ['room_id'],
            referencedTableName: 'rooms',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({ name: 'idx_users_role_id', columnNames: ['role_id'] }),
    );
    await queryRunner.createIndex(
      'users',
      new TableIndex({ name: 'idx_users_status', columnNames: ['status'] }),
    );
    await queryRunner.createIndex(
      'rooms',
      new TableIndex({
        name: 'idx_rooms_room_type',
        columnNames: ['room_type'],
      }),
    );
    await queryRunner.createIndex(
      'rooms',
      new TableIndex({ name: 'idx_rooms_status', columnNames: ['status'] }),
    );
    await queryRunner.createIndex(
      'rooms',
      new TableIndex({
        name: 'idx_rooms_featured_order',
        columnNames: ['featured_order'],
      }),
    );
    await queryRunner.createIndex(
      'room_images',
      new TableIndex({
        name: 'idx_room_images_room_id',
        columnNames: ['room_id'],
      }),
    );
    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'idx_bookings_room_id',
        columnNames: ['room_id'],
      }),
    );
    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'idx_bookings_user_id',
        columnNames: ['user_id'],
      }),
    );
    await queryRunner.createIndex(
      'bookings',
      new TableIndex({ name: 'idx_bookings_status', columnNames: ['status'] }),
    );
    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'idx_bookings_payment_status',
        columnNames: ['payment_status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bookings', true);
    await queryRunner.dropTable('room_amenities', true);
    await queryRunner.dropTable('amenities', true);
    await queryRunner.dropTable('room_images', true);
    await queryRunner.dropTable('rooms', true);
    await queryRunner.dropTable('password_reset_tokens', true);
    await queryRunner.dropTable('users', true);
    await queryRunner.dropTable('roles', true);
  }
}
