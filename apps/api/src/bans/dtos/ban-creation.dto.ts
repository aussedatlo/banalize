import { type BanCreationDto as BanCreation } from "@banalize/types";
import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsPositive,
  IsString,
} from "class-validator";

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

  @IsString()
  @ApiProperty({
    example: "66dca3ca17f21044b9dbcaf5",
    description: "the id of the config",
  })
  readonly configId: string;

  @IsBoolean()
  @ApiProperty({
    example: true,
    description: "indicates if the ban was created manually",
    default: false,
  })
  readonly isManual: boolean;

  @IsArray()
  @IsOptional()
  @ApiProperty({
    example: ["test 192.168.1.1 300", "test 192.168.1.1 400"],
    description: "array of matched lines that triggered the ban",
    required: false,
  })
  readonly matches?: string[];
}
