import { ApiProperty } from "@nestjs/swagger";
import { IsPositive, IsString } from "class-validator";

export class CreateMatchDto {
  @IsString()
  @ApiProperty({
    example: "test 192.168.1.1 300",
    description: "the matched line",
  })
  readonly line: string;

  @IsString()
  @ApiProperty({
    example: "^test.*<IP>.*300$",
    description: "the matched regex",
  })
  readonly regex: string;

  @IsString()
  @ApiProperty({
    example: "192.168.1.1",
    description: "the matched ip",
  })
  readonly ip: string;

  @IsPositive()
  @ApiProperty({
    example: 1633297200000,
    description: "the timestamp of the match event",
  })
  readonly timestamp: number;

  @IsString()
  @ApiProperty({
    example: "66dca3ca17f21044b9dbcaf5",
    description: "the id of the config",
  })
  readonly configId: string;
}
