import { Module } from '@nestjs/common';
import { GainsEngineService } from './gains-engine.service';

@Module({
  providers: [GainsEngineService],
  exports: [GainsEngineService],
})
export class GainsEngineModule {}