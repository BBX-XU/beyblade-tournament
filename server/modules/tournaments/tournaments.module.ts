import { Module } from '@nestjs/common';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { BracketService } from './bracket.service';

@Module({
  controllers: [TournamentsController],
  providers: [TournamentsService, BracketService],
})
export class TournamentsModule {}
