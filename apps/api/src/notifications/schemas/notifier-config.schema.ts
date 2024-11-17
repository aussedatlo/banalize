import {
  EventType,
  NotifierConfigSchema as NotifierConfig,
} from "@banalize/types";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { HydratedDocument } from "mongoose";
import { NotifierEmailConfigSchema } from "./notifier-email-config.schema";
import { NotifierSignalConfigSchema } from "./notifier-signal-config.schema";

export type NotifierConfigSchemaDocument =
  HydratedDocument<NotifierConfigSchema>;

@Schema({
  toJSON: {
    versionKey: false,
  },
})
export class NotifierConfigSchema implements NotifierConfig {
  @ApiProperty({
    example: "66dca3ca17f21044b9dbcaf5",
    description: "the id of the ban event",
  })
  _id: string;

  @Prop({ type: Object.keys(EventType), required: true })
  events: EventType[];

  @Prop({ type: NotifierEmailConfigSchema, required: false })
  emailConfig?: NotifierEmailConfigSchema;

  @Prop({ type: NotifierSignalConfigSchema, required: false })
  signalConfig?: NotifierSignalConfigSchema;
}

export const NotifierConfigSchemaDefinition =
  SchemaFactory.createForClass(NotifierConfigSchema);
