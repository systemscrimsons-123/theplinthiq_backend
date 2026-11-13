import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { CollectorsService } from './collectors.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  UpdateCollectorProfileDto,
  CreateCollectionDto,
  UpdateCollectionDto,
  AddCollectionItemDto,
  QueryCollectorsDto,
} from './dto/collector.dto';

@Controller('collectors')
export class CollectorsController {
  constructor(private readonly collectorsService: CollectorsService) {}

  /**
   * GET /api/collectors — pseudonym-safe public collector directory
   */
  @Get()
  listCollectors(@Query() query: QueryCollectorsDto) {
    return this.collectorsService.listCollectors(query);
  }

  /**
   * GET /api/collectors/me — current logged-in collector profile
   */
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('collector')
  getMyProfile(@CurrentUser() user: any) {
    return this.collectorsService.getMyProfile(user.id);
  }

  /**
   * PUT /api/collectors/me — update current collector profile & privacy settings
   */
  @Put('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('collector')
  updateMyProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateCollectorProfileDto,
  ) {
    return this.collectorsService.updateMyProfile(user.id, dto);
  }

  /**
   * GET /api/collectors/me/collections — list my collections / moodboards
   */
  @Get('me/collections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('collector')
  getCollections(@CurrentUser() user: any) {
    return this.collectorsService.getCollections(user.id);
  }

  /**
   * POST /api/collectors/me/collections — create a new private collection
   */
  @Post('me/collections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('collector')
  createCollection(
    @CurrentUser() user: any,
    @Body() dto: CreateCollectionDto,
  ) {
    return this.collectorsService.createCollection(user.id, dto);
  }

  /**
   * GET /api/collectors/me/collections/:id — view collection details & saved artworks
   */
  @Get('me/collections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('collector')
  getCollection(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.collectorsService.getCollection(user.id, id);
  }

  /**
   * PUT /api/collectors/me/collections/:id — update collection details
   */
  @Put('me/collections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('collector')
  updateCollection(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collectorsService.updateCollection(user.id, id, dto);
  }

  /**
   * DELETE /api/collectors/me/collections/:id — delete collection
   */
  @Delete('me/collections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('collector')
  deleteCollection(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.collectorsService.deleteCollection(user.id, id);
  }

  /**
   * POST /api/collectors/me/collections/:id/items — save artwork to collection
   */
  @Post('me/collections/:id/items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('collector')
  addCollectionItem(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: AddCollectionItemDto,
  ) {
    return this.collectorsService.addCollectionItem(user.id, id, dto);
  }

  /**
   * DELETE /api/collectors/me/collections/:id/items/:itemId — remove artwork from collection
   */
  @Delete('me/collections/:id/items/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('collector')
  removeCollectionItem(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.collectorsService.removeCollectionItem(user.id, id, itemId);
  }

  /**
   * GET /api/collectors/:id — public collector profile (pseudonymised unless revealed)
   */
  @Get(':id')
  getPublicProfile(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.collectorsService.getPublicProfile(id, user?.id);
  }
}
