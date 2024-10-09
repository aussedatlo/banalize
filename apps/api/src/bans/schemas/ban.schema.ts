import { type BanSchema as Ban } from "@banalize/types";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { HydratedDocument } from "mongoose";

export type BanSchemaDocument = HydratedDocument<BanSchema>;

@Schema({
  toJSON: {
    versionKey: false,
  },
})
export class BanSchema implements Ban {
  @ApiProperty({
    example: "66dca3ca17f21044b9dbcaf5",
    description: "the id of the ban event",
  })
  _id: string;

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

  @Prop()
  @ApiProperty({
    example: true,
    description: "the ban active status",
  })
  active: boolean;
}

export const BanSchemaDefinition = SchemaFactory.createForClass(BanSchema);
