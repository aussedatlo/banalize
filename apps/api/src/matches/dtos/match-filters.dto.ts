import { type MatchFiltersDto as MatchFilters } from "@banalize/types";
import { ApiProperty } from "@nestjs/swagger";
import { IsIP, IsOptional, IsString } from "class-validator";

export class MatchFiltersDto implements MatchFilters {
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
    description: "the ip",
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIP(4)
  readonly ip?: string;

  @ApiProperty({
    example: "1633311600000",
    description: "the timestamp greater than",
    required: false,
  })
  @IsOptional()
  readonly timestamp_gt?: number;
}