import { type BanModificationDto as BanModification } from "@banalize/types";
import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class BanModificationDto implements BanModification {
  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    example: true,
    description: "Indicates if the ban is currently active",
    required: false, // This makes it optional in the API documentation
  })
  readonly active?: boolean;
}
