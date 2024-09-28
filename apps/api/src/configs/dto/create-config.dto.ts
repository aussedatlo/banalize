import { ApiProperty } from "@nestjs/swagger";
import {
  Contains,
  IsArray,
  IsIn,
  IsIP,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from "class-validator";
import { WatcherType } from "src/configs/enums/watcher-type";
import { CreateConfig } from "src/configs/interfaces/create-config.interface";
import { IsRegex } from "src/configs/utils/is-regex-validator";

const watcherType = ["file", "docker"] as const;

export class CreateConfigDto implements CreateConfig {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: "/path/file.log",
    description: "the param of the watcher",
  })
  readonly param: string;

  @IsString()
  @IsNotEmpty()
  @Contains("<IP>")
  @IsRegex()
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
  readonly watcherType: WatcherType;

  @IsArray()
  @IsString({ each: true })
  @IsIP("4", { each: true })
  @IsOptional()
  @ApiProperty({
    example: ["192.168.1.1"],
    description: "the list of IPs to ignore",
    required: false,
  })
  readonly ignoreIps?: string[];
}
