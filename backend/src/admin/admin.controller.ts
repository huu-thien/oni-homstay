import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessTokenAuthGuard } from '../auth/guards/access-token-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import {
  AdminBookingListQueryDto,
  AdminRoomListQueryDto,
  AdminUserListQueryDto,
  AnalyticsRangeQueryDto,
  CreateAdminUserDto,
  ReorderRoomImagesDto,
  RoomImagesPayloadDto,
  UploadRoomImagesDto,
  UpdateAdminUserDto,
  UpdateBookingStatusDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  UpsertAmenityDto,
  UpsertRoomDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(AccessTokenAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('rooms')
  listRooms(@Query() query: AdminRoomListQueryDto) {
    return this.adminService.listRooms(query);
  }

  @Get('rooms/:id')
  getRoomDetail(@Param('id') id: string) {
    return this.adminService.getRoomDetail(id);
  }

  @Post('rooms')
  createRoom(@Body() payload: UpsertRoomDto) {
    return this.adminService.createRoom(payload);
  }

  @Patch('rooms/:id')
  updateRoom(@Param('id') id: string, @Body() payload: UpsertRoomDto) {
    return this.adminService.updateRoom(id, payload);
  }

  @Delete('rooms/:id')
  deleteRoom(@Param('id') id: string) {
    return this.adminService.deleteRoom(id);
  }

  @Post('rooms/:id/images')
  uploadRoomImages(
    @Param('id') id: string,
    @Body() payload: RoomImagesPayloadDto,
  ) {
    return this.adminService.uploadRoomImages(id, payload);
  }

  @Post('rooms/:id/images/reorder')
  reorderRoomImages(
    @Param('id') id: string,
    @Body() payload: ReorderRoomImagesDto,
  ) {
    return this.adminService.reorderRoomImages(id, payload);
  }

  @Delete('rooms/:roomId/images/:imageId')
  deleteRoomImage(
    @Param('roomId') roomId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.adminService.deleteRoomImage(roomId, imageId);
  }

  @Post('uploads/room-images')
  @UseInterceptors(FilesInterceptor('files', 10))
  uploadRoomImagesToStorage(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() payload: UploadRoomImagesDto,
  ) {
    return this.adminService.uploadRoomImagesToStorage(files, payload);
  }

  @Get('amenities')
  listAmenities() {
    return this.adminService.listAmenities();
  }

  @Post('amenities')
  createAmenity(@Body() payload: UpsertAmenityDto) {
    return this.adminService.createAmenity(payload);
  }

  @Patch('amenities/:id')
  updateAmenity(@Param('id') id: string, @Body() payload: UpsertAmenityDto) {
    return this.adminService.updateAmenity(id, payload);
  }

  @Delete('amenities/:id')
  deleteAmenity(@Param('id') id: string) {
    return this.adminService.deleteAmenity(id);
  }

  @Get('bookings')
  listBookings(@Query() query: AdminBookingListQueryDto) {
    return this.adminService.listBookings(query);
  }

  @Get('bookings/:id')
  getBookingDetail(@Param('id') id: string) {
    return this.adminService.getBookingDetail(id);
  }

  @Patch('bookings/:id/status')
  updateBookingStatus(
    @Param('id') id: string,
    @Body() payload: UpdateBookingStatusDto,
  ) {
    return this.adminService.updateBookingStatus(id, payload);
  }

  @Post('bookings/:id/cancel')
  cancelBooking(@Param('id') id: string) {
    return this.adminService.cancelBooking(id);
  }

  @Post('bookings/:id/refund')
  refundBooking(@Param('id') id: string) {
    return this.adminService.refundBooking(id);
  }

  @Get('users')
  listUsers(@Query() query: AdminUserListQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Post('users')
  createUser(@Body() payload: CreateAdminUserDto) {
    return this.adminService.createUser(payload);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() payload: UpdateAdminUserDto) {
    return this.adminService.updateUser(id, payload);
  }

  @Patch('users/:id/role')
  updateUserRole(@Param('id') id: string, @Body() payload: UpdateUserRoleDto) {
    return this.adminService.updateUserRole(id, payload);
  }

  @Patch('users/:id/status')
  updateUserStatus(
    @Param('id') id: string,
    @Body() payload: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(id, payload);
  }

  @Get('analytics/dashboard-summary')
  getDashboardSummary() {
    return this.adminService.getDashboardSummary();
  }

  @Get('analytics/revenue-timeline')
  getRevenueTimeline(@Query() query: AnalyticsRangeQueryDto) {
    return this.adminService.getRevenueTimeline(query);
  }

  @Get('analytics/top-rooms')
  getTopRooms() {
    return this.adminService.getTopRooms();
  }
}
