import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaxonomyCategory } from '@prisma/client';

@Controller('taxonomy')
export class TaxonomyController {
  constructor(private prisma: PrismaService) {}

  /** GET /api/taxonomy?category=medium|aesthetic|interest */
  @Get()
  async list(@Query('category') category?: TaxonomyCategory) {
    const where = category ? { category } : {};
    return this.prisma.taxonomyTerm.findMany({
      where,
      orderBy: { label: 'asc' },
    });
  }
}

