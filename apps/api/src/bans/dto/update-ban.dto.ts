import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { UpdateBan } from "src/bans/interfaces/update-ban.interface";
import { CreateBanDto } from "./create-ban.dto";

export class UpdateBanDto
  extends PartialType(CreateBanDto)
  implements UpdateBan
{
  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    example: true,
    description: "Indicates if the ban is currently active",
    required: false, // This makes it optional in the API documentation
  })
  readonly active?: boolean;
}
