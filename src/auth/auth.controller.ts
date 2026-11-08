import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsInt, Min } from 'class-validator';
import { AuthService } from './auth.service';
import { AdminLoginDto, LoginDto, RegisterDto } from './dto';
import type { JwtPayload } from './jwt.strategy';

class TopupRequestDto {
  @IsInt()
  @Min(100)
  amount: number;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('admin')
  admin(@Body() dto: AdminLoginDto) {
    return this.auth.adminLogin(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Req() req: { user: JwtPayload }) {
    return this.auth.me(req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('topup')
  topup(@Req() req: { user: JwtPayload }, @Body() dto: TopupRequestDto) {
    return this.auth.requestTopup(req.user.sub, dto.amount);
  }
}
