import { NotifierEmailConfigSchema } from "@banalize/types";
import { ApiProperty } from "@nestjs/swagger";

export class NotifierEmailConfigDto implements NotifierEmailConfigSchema {
  @ApiProperty({
    example: "smtp.gmail.com",
    description: "the email server",
    required: true,
  })
  server: string;

  @ApiProperty({
    example: 587,
    description: "the email server port",
  })
  port: number;

  @ApiProperty({
    example: "",
  })
  username: string;

  @ApiProperty({
    example: "",
  })
  password: string;

  @ApiProperty({
    example: "",
  })
  recipientEmail: string;
}
