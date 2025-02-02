import { type BanSchema as Ban } from "@banalize/types";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsOptional } from "class-validator";
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

  @Prop({
    type: String,
  })
  @ApiProperty({
    example: "192.168.1.1",
    description: "the matched ip",
  })
  ip: string;

  @Prop({
    type: Number,
  })
  @ApiProperty({
    example: 1633297200000,
    description: "the timestamp of the match event",
  })
  timestamp: number;

  @Prop({
    type: String,
  })
  @ApiProperty({
    example: "66dca3ca17f21044b9dbcaf5",
    description: "the id of the config",
  })
  configId: string;

  @Prop({
    type: Boolean,
  })
  @ApiProperty({
    example: true,
    description: "the ban active status",
  })
  active: boolean;

  @IsBoolean()
  @ApiProperty({
    example: true,
    description: "indicates if the ban was created manually",
    default: false,
  })
  readonly isManual: boolean;

  @IsArray()
  @IsOptional()
  @ApiProperty({
    example: ["test 192.168.1.1 300", "test 192.168.1.1 400"],
    description: "array of matched lines that triggered the ban",
    required: false,
  })
  readonly matches?: string[];
}

export const BanSchemaDefinition = SchemaFactory.createForClass(BanSchema);
