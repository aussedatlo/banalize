import { NotifierEmailConfigSchema as NotifierEmailConfig } from "@banalize/types";
import { Prop } from "@nestjs/mongoose";

export class NotifierEmailConfigSchema implements NotifierEmailConfig {
  @Prop({ required: true })
  server: string;

  @Prop({ required: true })
  port: number;

  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  recipientEmail: string;
}
