import { ApiProperty } from "@nestjs/swagger";
import { IsPositive, IsString } from "class-validator";
import { CreateUnban } from "src/unbans/interfaces/create-unban.interface";

export class CreateUnbanDto implements CreateUnban {
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

  @IsString()
  @ApiProperty({
    example: "66dca3ca17f21044b9dbcaf5",
    description: "the id of the config",
  })
  readonly configId: string;

  @IsString()
  @ApiProperty({
    example: "66dca3ca17f21044b9dbcaf5",
    description: "the id of the ban",
  })
  readonly banId: string;
}