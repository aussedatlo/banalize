import { IpInfosFiltersDto as IpInfosFilters } from "@banalize/types";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsArray, IsIP } from "class-validator";

export class IpInfosFiltersDto implements IpInfosFilters {
  @ApiProperty({
    example: ["8.8.8.8", "2.2.2.2"],
    description: "the status of an event",
    required: false,
    type: String,
    isArray: true,
  })
  @IsArray()
  @IsIP("4", { each: true })
  @Transform(({ value }) =>
    typeof value === "string" ? value.split(",").map((v) => v.trim()) : value,
  )
  ips: string[];
}
