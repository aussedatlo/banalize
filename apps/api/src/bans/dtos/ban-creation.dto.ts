import { type BanCreationDto as BanCreation } from "@banalize/types";
import { ApiProperty } from "@nestjs/swagger";
import { IsPositive, IsString } from "class-validator";

export class BanCreationDto implements BanCreation {
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
