import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Plan, Role, TopupStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

const PLAN_FROM_LABEL: Record<string, Plan> = {
  'Basic Plan': Plan.BASIC,
  'Premium Plan': Plan.PREMIUM,
  'Golden Plan': Plan.GOLDEN,
  BASIC: Plan.BASIC,
  PREMIUM: Plan.PREMIUM,
  GOLDEN: Plan.GOLDEN,
};

class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  plan?: string;
}

class FundDto {
  @IsInt()
  @Min(100)
  amount: number;

  @IsOptional()
  @IsEnum(TopupStatus)
  status?: TopupStatus;
}

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(
    private prisma: PrismaService,
    private auth: AuthService,
  ) {}

  @Get()
  async list() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { topups: { orderBy: { createdAt: 'desc' } } },
    });
    return users.map((user) => ({
      ...this.auth.publicUser(user),
      topups: user.topups,
    }));
  }

  @Post()
  async create(@Body() dto: UpdateUserDto & { password?: string }) {
    const bcrypt = await import('bcryptjs');
    const user = await this.prisma.user.create({
      data: {
        name: dto.name?.trim() || 'Member',
        email: (dto.email || '').trim().toLowerCase(),
        phone: dto.phone?.trim() || null,
        passwordHash: await bcrypt.hash(dto.password || 'Member786', 10),
        plan: PLAN_FROM_LABEL[dto.plan || 'Premium Plan'] ?? Plan.PREMIUM,
        role: Role.USER,
      },
    });
    return this.auth.publicUser(user);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.email ? { email: dto.email.trim().toLowerCase() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        ...(dto.plan ? { plan: PLAN_FROM_LABEL[dto.plan] ?? Plan.PREMIUM } : {}),
      },
    });
    return this.auth.publicUser(user);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }

  @Post(':id/fund')
  async fund(@Param('id') id: string, @Body() dto: FundDto) {
    const status = dto.status ?? TopupStatus.ADDED;
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(status === TopupStatus.ADDED ? { wallet: { increment: dto.amount } } : {}),
        topups: {
          create: {
            amount: dto.amount,
            method: 'Admin credit',
            status,
          },
        },
      },
    });
    return this.auth.publicUser(user);
  }

  @Post(':id/wallet-reset')
  async resetWallet(@Param('id') id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { wallet: 0 },
    });
    return this.auth.publicUser(user);
  }
}
