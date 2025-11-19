import { PartialType } from '@nestjs/swagger';
import { CreateSubModuleDto } from './create-submodule.dto';
import { IsOptional } from 'class-validator';

export class UpdateSubModuleDto extends PartialType(CreateSubModuleDto) {
  // moduleId no se puede actualizar
  @IsOptional()
  moduleId?: never;
}

