import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { GuestCheckoutBookingDto } from './dto/guest-checkout-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('guest-checkout')
  createGuestCheckout(@Body() payload: GuestCheckoutBookingDto) {
    return this.bookingsService.createGuestCheckout(payload);
  }

  @Get('code/:bookingCode')
  getBookingByCode(@Param('bookingCode') bookingCode: string) {
    return this.bookingsService.getBookingByCode(bookingCode);
  }
}
