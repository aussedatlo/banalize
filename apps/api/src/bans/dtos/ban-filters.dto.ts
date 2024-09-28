import { type BanFiltersDto as BanFilters } from "@banalize/types";
import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class BanFiltersDto implements BanFilters {
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

  @ApiProperty({
    example: true,
    description: "Indicates if the ban is currently active",
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly active?: boolean;
}