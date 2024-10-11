import { Controller, Get, Param, ParseArrayPipe, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { IpInfosFiltersDto } from "./dtos/ip-infos-filters.dto";
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

  @Get()
  @ApiOperation({ summary: "get ip infos for multiple IPs" })
  @ApiResponse({ type: [IpInfosResponse] })
  async findMany(
    @Query("ips", ParseArrayPipe) ips: string[],
  ): Promise<Record<string, Partial<IpInfosResponse>>> {
    const filters: IpInfosFiltersDto = { ips };
    return this.ipInfosService.findMany(filters);
  }
}
