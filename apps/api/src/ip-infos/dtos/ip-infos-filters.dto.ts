import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsIP } from "class-validator";

export class IpInfosFiltersDto {
  @ApiProperty({
    example: ["8.8.8.8", "2.2.2.2"],
    description: "the status of an event",
    required: false,
    type: String,
    isArray: true,
  })
  @IsArray()
  @IsIP("4", { each: true })
  ips: string[];
}
