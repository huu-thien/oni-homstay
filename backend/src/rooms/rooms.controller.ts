import { Controller, Get, Param, Query } from '@nestjs/common';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { ListRoomsQueryDto } from './dto/list-rooms-query.dto';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  listRooms(@Query() query: ListRoomsQueryDto) {
    return this.roomsService.listRooms(query);
  }

  @Get('availability')
  getAvailability(@Query() query: AvailabilityQueryDto) {
    return this.roomsService.getAvailability(query);
  }

  @Get(':slug')
  getRoomDetail(@Param('slug') slug: string) {
    return this.roomsService.getRoomDetail(slug);
  }
}
