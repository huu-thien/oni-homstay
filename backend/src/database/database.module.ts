import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseSeedService } from './database-seed.service';
import { typeOrmEntities, getTypeOrmOptions } from './typeorm.config';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => getTypeOrmOptions(),
    }),
    TypeOrmModule.forFeature(typeOrmEntities),
  ],
  providers: [DatabaseSeedService],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
