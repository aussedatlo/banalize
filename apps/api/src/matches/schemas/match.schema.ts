import { type MatchSchema as Match } from "@banalize/types";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { HydratedDocument } from "mongoose";

export type MatchSchemaDocument = HydratedDocument<MatchSchema>;

@Schema({
  toJSON: {
    versionKey: false,
  },
})
export class MatchSchema implements Match {
  @ApiProperty({
    example: "66dca3ca17f21044b9dbcaf5",
    description: "the id of the match event",
  })
  _id: string;

  @Prop()
  @ApiProperty({
    example: "test 192.168.1.1 300",
    description: "the matched line",
  })
  line: string;

  @Prop()
  @ApiProperty({
    example: "^test.*<IP>.*300$",
    description: "the matched regex",
  })
  regex: string;

  @Prop()
  @ApiProperty({
    example: "192.168.1.1",
    description: "the matched ip",
  })
  ip: string;

  @Prop()
  @ApiProperty({
    example: 1633297200000,
    description: "the timestamp of the match event",
  })
  timestamp: number;

  @Prop()
  @ApiProperty({
    example: "66dca3ca17f21044b9dbcaf5",
    description: "the id of the config",
  })
  configId: string;
}

export const MatchSchemaDefinition = SchemaFactory.createForClass(MatchSchema);
