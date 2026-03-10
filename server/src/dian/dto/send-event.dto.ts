import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendEventDto {
  @ApiProperty({
    description: 'Código del evento DIAN',
    enum: ['030', '031', '032', '033'],
    example: '030',
  })
  @IsIn(['030', '031', '032', '033'])
  eventCode: '030' | '031' | '032' | '033';

  @ApiPropertyOptional({
    description: 'Razón de reclamo (requerido para evento 031)',
    example: 'Producto no corresponde a lo solicitado',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
