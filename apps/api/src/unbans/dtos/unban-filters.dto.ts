import { type UnbanFiltersDto as UnbanFilters } from "@banalize/types";
import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UnbanFiltersDto implements UnbanFilters {
  @ApiProperty({
    example: "66dca3ca17f21044b9dbcaf5",
    description: "the id of the config",
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly configId?: string;

  @ApiProperty({
    example: "192.168.1.1",
    description: "the matched ip",
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly ip?: string;
}
