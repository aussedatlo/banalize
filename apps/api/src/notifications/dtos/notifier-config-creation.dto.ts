import {
  EventType,
  NotifierConfigDto as NotifierConfig,
} from "@banalize/types";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { NotifierEmailConfigDto } from "./notifier-email-config.dto";
import { NotifierSignalConfigDto } from "./notifier-signal-config.dto";

export class NotifierConfigDto implements NotifierConfig {
  @IsEnum(EventType, { each: true })
  @ApiProperty({
    example: [EventType.BAN, EventType.UNBAN],
    description: "the events to notify",
    required: true,
    isArray: true,
  })
  events: EventType[];

  @ApiProperty({
    description: "the email configuration",
    type: NotifierEmailConfigDto,
  })
  emailConfig?: NotifierEmailConfigDto | null = null;

  @ApiProperty({
    description: "the signal configuration",
    type: NotifierSignalConfigDto,
  })
  signalConfig?: NotifierSignalConfigDto | null = null;
}
