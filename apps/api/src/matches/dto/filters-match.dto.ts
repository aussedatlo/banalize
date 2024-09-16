import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class FiltersMatchesDto {
  @ApiProperty({
    example: "66dca3ca17f21044b9dbcaf5",
    description: "the id of the config",
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly configId?: string;

  @ApiProperty({
    example: "1633311600000",
    description: "the timestamp greater than",
    required: false,
  })
  @IsOptional()
  readonly timestamp_gt?: number;
}
