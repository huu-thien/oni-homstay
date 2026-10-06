import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRoomPassword1721820000000 implements MigrationInterface {
  name = 'AddRoomPassword1721820000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'rooms',
      new TableColumn({
        name: 'password',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('rooms', 'password');
  }
}
