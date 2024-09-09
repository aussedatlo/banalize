import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsPositive, IsString } from "class-validator";

const watcherType = ["file", "docker"] as const;

export class CreateConfigDto {
  @IsString()
  @ApiProperty({
    example: "/path/file.log",
    description: "the param of the watcher",
  })
  readonly param: string;

  @IsString()
  @ApiProperty({
    example: "^test.*<IP>.*300$",
    description: "the regex to match",
  })
  readonly regex: string;

  @IsPositive()
  @ApiProperty({
    example: 300,
    description: "the ban time in seconds",
  })
  readonly banTime: number;

  @IsPositive()
  @ApiProperty({
    example: 600,
    description: "the find time in seconds",
  })
  readonly findTime: number;

  @IsPositive()
  @ApiProperty({
    example: 3,
    description: "the max matches to ban",
  })
  readonly maxMatches: number;

  @IsString()
  @IsIn(watcherType)
  @ApiProperty({
    example: "file",
    description: "the watcher type",
  })
  readonly watcherType: string;
}