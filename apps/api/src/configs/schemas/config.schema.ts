import { type ConfigSchema as Config, WatcherType } from "@banalize/types";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { HydratedDocument } from "mongoose";

export type ConfigSchemaDocument = HydratedDocument<ConfigSchema>;

@Schema({
  toJSON: {
    versionKey: false,
  },
})
export class ConfigSchema implements Config {
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
  watcherType: WatcherType;

  @Prop()
  @ApiProperty({
    example: ["192.168.1.1"],
    description: "the ips to ignore",
  })
  ignoreIps: string[];
}

export const ConfigSchemaDefinition =
  SchemaFactory.createForClass(ConfigSchema);
