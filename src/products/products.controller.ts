import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

class ProductDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

function cleanImages(images?: string[], imageUrl?: string) {
  const fromList = (images ?? []).map((item) => item.trim()).filter(Boolean);
  const cover = imageUrl?.trim() || '';
  const merged = [...fromList];
  if (cover && !merged.includes(cover)) merged.unshift(cover);
  return {
    images: merged,
    imageUrl: merged[0] || cover || '',
  };
}

@Controller('products')
export class ProductsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  listPublic() {
    return this.prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('admin/all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  listAll() {
    return this.prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: ProductDto) {
    const media = cleanImages(dto.images, dto.imageUrl);
    return this.prisma.product.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || '',
        price: dto.price,
        imageUrl: media.imageUrl,
        images: media.images,
        active: dto.active ?? true,
      },
    });
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    try {
      const media =
        dto.images !== undefined || dto.imageUrl !== undefined
          ? cleanImages(dto.images, dto.imageUrl)
          : null;
      return await this.prisma.product.update({
        where: { id },
        data: {
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(media
            ? {
                imageUrl: media.imageUrl,
                images: media.images,
              }
            : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
      });
    } catch {
      throw new NotFoundException('Product not found');
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string) {
    try {
      await this.prisma.product.delete({ where: { id } });
      return { ok: true };
    } catch {
      throw new NotFoundException('Product not found');
    }
  }
}
