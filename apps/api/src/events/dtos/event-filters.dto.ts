import {
  EventFiltersDto as EventFilters,
  EventStatus,
  EventType,
} from "@banalize/types";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";

export class EventFiltersDto implements EventFilters {
  @ApiProperty({
    example: "66dca3ca17f21044b9dbcaf5",
    description: "the id of the config",
    required: true,
  })
  @IsString()
  configId: string;

  @ApiProperty({
    example: ["match", "ban"],
    description: "the types of the events",
    required: false,
    type: EventType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(EventType, { each: true })
  @Transform(({ value }) =>
    typeof value === "string" ? value.split(",").map((v) => v.trim()) : value,
  )
  type?: EventType[];

  @ApiProperty({
    example: ["stale", "unbanned"],
    description: "the status of an event",
    required: false,
    type: EventStatus,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(EventStatus, { each: true })
  @Transform(({ value }) =>
    typeof value === "string" ? value.split(",").map((v) => v.trim()) : value,
  )
  status?: EventStatus[];

  @ApiProperty({
    example: "192.168.1.1",
    description: "the matched ip",
    required: false,
  })
  @IsOptional()
  @IsString()
  ip?: string;

  @ApiProperty({
    example: 1,
    description: "the page number",
    required: false,
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value.trim()))
  page?: number;

  @ApiProperty({
    example: 10,
    description: "the number of items per page",
    required: false,
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value.trim()))
  limit?: number;
}
