import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsPositive, IsString } from "class-validator";

export class CreateBanDto {
  @IsString()
  @ApiProperty({
    example: "192.168.1.1",
    description: "the matched ip",
  })
  readonly ip: string;

  @IsPositive()
  @ApiProperty({
    example: 1633297200000,
    description: "the timestamp of the ban event",
  })
  readonly timestamp: number;

  @IsPositive()
  @ApiProperty({
    example: 30,
    description: "the ban time duration in seconds",
  })
  readonly banTime: number;

  @IsString()
  @ApiProperty({
    example: "66dca3ca17f21044b9dbcaf5",
    description: "the id of the config",
  })
  readonly configId: string;
}

export class UpdateBanDto extends PartialType(CreateBanDto) {
  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    example: true,
    description: "Indicates if the ban is currently active",
    required: false, // This makes it optional in the API documentation
  })
  readonly active?: boolean;
}
