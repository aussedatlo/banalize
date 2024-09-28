import { type StatsTimelineFiltersDto as StatsTimelineFilters } from "@banalize/types";
import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";

const period = ["monthly", "weekly", "daily"] as const;

export class StatsTimelineFiltersDto implements StatsTimelineFilters {
  @IsString()
  @IsIn(period)
  @ApiProperty({
    example: "daily",
    description: "the period of the stats",
  })
  readonly period: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: "66dca3ca17f21044b9dbcaf5",
    description: "the config to filter",
    required: false,
  })
  readonly configId?: string;
}
