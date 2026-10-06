import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddBookingPaymentEmail1721810000000 implements MigrationInterface {
  name = 'AddBookingPaymentEmail1721810000000';

  private getIdType(queryRunner: QueryRunner) {
    return queryRunner.connection.options.type === 'postgres'
      ? 'uuid'
      : 'varchar';
  }

  private getDateTimeType(queryRunner: QueryRunner) {
    return queryRunner.connection.options.type === 'postgres'
      ? 'timestamp'
      : 'datetime';
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'must_change_password',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.addColumns('bookings', [
      new TableColumn({
        name: 'room_price_snapshot',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
      }),
      new TableColumn({
        name: 'hold_expires_at',
        type: this.getDateTimeType(queryRunner),
        isNullable: true,
      }),
      new TableColumn({
        name: 'confirmed_at',
        type: this.getDateTimeType(queryRunner),
        isNullable: true,
      }),
      new TableColumn({
        name: 'cancelled_at',
        type: this.getDateTimeType(queryRunner),
        isNullable: true,
      }),
      new TableColumn({
        name: 'refunded_at',
        type: this.getDateTimeType(queryRunner),
        isNullable: true,
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'payments',
        columns: [
          {
            name: 'id',
            type: this.getIdType(queryRunner),
            length:
              queryRunner.connection.options.type === 'postgres'
                ? undefined
                : '36',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'booking_id',
            type: this.getIdType(queryRunner),
            isNullable: false,
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '40',
            isNullable: false,
          },
          {
            name: 'provider_order_id',
            type: 'varchar',
            length: '100',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
            default: "'PENDING'",
          },
          {
            name: 'checkout_url',
            type: 'varchar',
            length: '1000',
            isNullable: true,
          },
          {
            name: 'qr_code_url',
            type: 'varchar',
            length: '1200',
            isNullable: true,
          },
          {
            name: 'provider_transaction_id',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: this.getDateTimeType(queryRunner),
            isNullable: true,
          },
          {
            name: 'paid_at',
            type: this.getDateTimeType(queryRunner),
            isNullable: true,
          },
          {
            name: 'failure_reason',
            type: 'varchar',
            length: '300',
            isNullable: true,
          },
          { name: 'provider_payload', type: 'text', isNullable: true },
          {
            name: 'created_at',
            type: this.getDateTimeType(queryRunner),
            default:
              queryRunner.connection.options.type === 'postgres'
                ? 'now()'
                : "datetime('now')",
          },
          {
            name: 'updated_at',
            type: this.getDateTimeType(queryRunner),
            default:
              queryRunner.connection.options.type === 'postgres'
                ? 'now()'
                : "datetime('now')",
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['booking_id'],
            referencedTableName: 'bookings',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'payment_events',
        columns: [
          {
            name: 'id',
            type: this.getIdType(queryRunner),
            length:
              queryRunner.connection.options.type === 'postgres'
                ? undefined
                : '36',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'payment_id',
            type: this.getIdType(queryRunner),
            isNullable: false,
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '40',
            isNullable: false,
          },
          {
            name: 'provider_event_id',
            type: 'varchar',
            length: '120',
            isNullable: false,
            isUnique: true,
          },
          { name: 'status', type: 'varchar', length: '30', isNullable: false },
          {
            name: 'signature_hash',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          { name: 'payload', type: 'text', isNullable: false },
          {
            name: 'processed_at',
            type: this.getDateTimeType(queryRunner),
            isNullable: true,
          },
          {
            name: 'created_at',
            type: this.getDateTimeType(queryRunner),
            default:
              queryRunner.connection.options.type === 'postgres'
                ? 'now()'
                : "datetime('now')",
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['payment_id'],
            referencedTableName: 'payments',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'email_logs',
        columns: [
          {
            name: 'id',
            type: this.getIdType(queryRunner),
            length:
              queryRunner.connection.options.type === 'postgres'
                ? undefined
                : '36',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'booking_id',
            type: this.getIdType(queryRunner),
            isNullable: true,
          },
          {
            name: 'user_id',
            type: this.getIdType(queryRunner),
            isNullable: true,
          },
          {
            name: 'email_type',
            type: 'varchar',
            length: '60',
            isNullable: false,
          },
          {
            name: 'dedupe_key',
            type: 'varchar',
            length: '150',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'recipient',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'subject',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
            default: "'PENDING'",
          },
          {
            name: 'error_message',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          { name: 'payload', type: 'text', isNullable: true },
          {
            name: 'sent_at',
            type: this.getDateTimeType(queryRunner),
            isNullable: true,
          },
          {
            name: 'created_at',
            type: this.getDateTimeType(queryRunner),
            default:
              queryRunner.connection.options.type === 'postgres'
                ? 'now()'
                : "datetime('now')",
          },
          {
            name: 'updated_at',
            type: this.getDateTimeType(queryRunner),
            default:
              queryRunner.connection.options.type === 'postgres'
                ? 'now()'
                : "datetime('now')",
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['booking_id'],
            referencedTableName: 'bookings',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
          new TableForeignKey({
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'idx_payments_booking_id',
        columnNames: ['booking_id'],
      }),
    );
    await queryRunner.createIndex(
      'payments',
      new TableIndex({ name: 'idx_payments_status', columnNames: ['status'] }),
    );
    await queryRunner.createIndex(
      'payment_events',
      new TableIndex({
        name: 'idx_payment_events_payment_id',
        columnNames: ['payment_id'],
      }),
    );
    await queryRunner.createIndex(
      'email_logs',
      new TableIndex({
        name: 'idx_email_logs_booking_id',
        columnNames: ['booking_id'],
      }),
    );
    await queryRunner.createIndex(
      'email_logs',
      new TableIndex({
        name: 'idx_email_logs_user_id',
        columnNames: ['user_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('email_logs', true);
    await queryRunner.dropTable('payment_events', true);
    await queryRunner.dropTable('payments', true);
    await queryRunner.dropColumns('bookings', [
      'room_price_snapshot',
      'hold_expires_at',
      'confirmed_at',
      'cancelled_at',
      'refunded_at',
    ]);
    await queryRunner.dropColumn('users', 'must_change_password');
  }
}
