import { NotifierSignalConfigSchema as NotifierSignalConfig } from "@banalize/types";
import { Prop } from "@nestjs/mongoose";

export class NotifierSignalConfigSchema implements NotifierSignalConfig {
  @Prop({ required: true })
  server: string;

  @Prop({ required: true })
  number: string;

  @Prop({ required: true })
  recipients: string[];
}
