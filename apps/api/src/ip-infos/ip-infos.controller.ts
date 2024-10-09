import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { IpInfosResponse } from "./responses/ip-infos.response";
import { IpInfosService } from "./services/ip-infos.service";

@ApiTags("ip-infos")
@Controller("ip-infos")
export class IpInfosController {
  constructor(private readonly ipInfosService: IpInfosService) {}

  @Get(":ip")
  @ApiOperation({ summary: "Get country code of an IP" })
  @ApiResponse({ type: IpInfosResponse })
  async findOne(@Param("ip") ip: string): Promise<IpInfosResponse> {
    return (await this.ipInfosService.findOne(ip)) as IpInfosResponse;
  }
}
