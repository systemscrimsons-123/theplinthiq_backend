import { Module } from '@nestjs/common';
import { ArtProfessionalsController } from './art-professionals.controller';
import { ArtProfessionalsService } from './art-professionals.service';

@Module({
  controllers: [ArtProfessionalsController],
  providers: [ArtProfessionalsService],
  exports: [ArtProfessionalsService],
})
export class ArtProfessionalsModule {}

