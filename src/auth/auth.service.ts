import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Plan, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLoginDto, LoginDto, RegisterDto } from './dto';

const PLAN_LABEL: Record<Plan, string> = {
  BASIC: 'Basic Plan',
  PREMIUM: 'Premium Plan',
  GOLDEN: 'Golden Plan',
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('An account with this email already exists.');

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        phone: dto.phone?.trim() || null,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: Role.USER,
        plan: Plan.PREMIUM,
      },
    });
    return this.session(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email or password is incorrect.');
    }
    return this.session(user);
  }

  async adminLogin(dto: AdminLoginDto) {
    const password = process.env.ADMIN_PASSWORD || '786786786';
    if (dto.password !== password) {
      throw new UnauthorizedException('Admin password is incorrect.');
    }
    const user = await this.prisma.user.findFirst({ where: { role: Role.ADMIN } });
    if (!user) throw new UnauthorizedException('Admin account is missing.');
    return this.session(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.publicUser(user);
  }

  session(user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: Role;
    plan: Plan;
    wallet: number;
  }) {
    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return { token, user: this.publicUser(user) };
  }

  publicUser(user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: Role;
    plan: Plan;
    wallet: number;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role,
      plan: PLAN_LABEL[user.plan],
      wallet: user.wallet,
    };
  }
}
