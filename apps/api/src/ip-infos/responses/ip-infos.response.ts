import { IpInfosResponse as IpInfos } from "@banalize/types";
import { ApiProperty } from "@nestjs/swagger";

export class IpInfosResponse implements Partial<IpInfos> {
  @ApiProperty({
    description: "Continent information.",
    type: "object",
    example: {
      code: "NA",
      name: "North America",
    },
  })
  readonly continent?: IpInfos["continent"];

  @ApiProperty({
    description: "Country information.",
    type: "object",
    example: {
      iso_code: "US",
      name: "United States",
    },
  })
  readonly country?: IpInfos["country"];

  @ApiProperty({
    description: "Location information.",
    type: "object",
    example: {
      accuracy_radius: 1000,
      latitude: 37.751,
      longitude: -97.822,
    },
  })
  readonly location?: IpInfos["location"];
}
