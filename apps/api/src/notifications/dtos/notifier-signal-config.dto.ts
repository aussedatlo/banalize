import { NotifierSignalConfigSchema } from "@banalize/types";
import { ApiProperty } from "@nestjs/swagger";

export class NotifierSignalConfigDto implements NotifierSignalConfigSchema {
  @ApiProperty({
    example: "http://localhost:3000",
    description: "the signal server",
    required: true,
  })
  server: string;

  @ApiProperty({
    example: "+123456789",
    description: "the signal number",
    required: true,
  })
  number: string;

  @ApiProperty({
    example: ["+123456789"],
    description: "the signal recipients",
    required: true,
  })
  recipients: string[];
}
