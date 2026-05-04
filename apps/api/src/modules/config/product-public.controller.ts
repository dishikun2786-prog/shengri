import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('产品')
@Controller('products')
export class ProductPublicController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: '获取所有启用的产品列表（公开）' })
  async getProducts() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        productCode: true,
        name: true,
        subtitle: true,
        description: true,
        category: true,
        reportType: true,
        originalPrice: true,
        currentPrice: true,
      },
    });

    return products.map((p) => ({
      ...p,
      originalPrice: Number(p.originalPrice),
      currentPrice: Number(p.currentPrice),
    }));
  }
}
