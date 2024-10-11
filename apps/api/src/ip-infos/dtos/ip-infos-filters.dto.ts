import { IsIP } from "class-validator";

export class IpInfosFiltersDto {
  @IsIP("4", { each: true })
  ips: string[];
}
