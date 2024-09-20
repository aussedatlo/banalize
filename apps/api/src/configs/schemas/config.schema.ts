import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { HydratedDocument } from "mongoose";

export type ConfigDocument = HydratedDocument<Config>;

@Schema({
  toJSON: {
    versionKey: false,
  },
})
export class Config {
  @ApiProperty({
    example: "66dca3ca17f21044b9dbcaf5",
    description: "the id of the config",
  })
  _id: string;

  @Prop()
  @ApiProperty({
    example: "/path/file.log",
    description: "the param of the watcher",
  })
  param: string;

  @Prop()
  @ApiProperty({
    example: "^test.*<IP>.*300$",
    description: "the regex to match",
  })
  regex: string;

  @Prop()
  @ApiProperty({
    example: 300,
    description: "the ban time in seconds",
  })
  banTime: number;

  @Prop()
  @ApiProperty({
    example: 600,
    description: "the find time in seconds",
  })
  findTime: number;

  @Prop()
  @ApiProperty({
    example: 3,
    description: "the max matches to ban",
  })
  maxMatches: number;

  @Prop()
  @ApiProperty({
    example: "file",
    description: "the watcher type",
  })
  watcherType: string;

  @Prop()
  @ApiProperty({
    example: ["192.168.1.1"],
    description: "the ips to ignore",
  })
  ignoreIps: string[];
}

export const ConfigSchema = SchemaFactory.createForClass(Config);
