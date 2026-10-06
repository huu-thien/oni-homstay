import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { getTypeOrmOptions } from './typeorm.config';

export default new DataSource(getTypeOrmOptions());
