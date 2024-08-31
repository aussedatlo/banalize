import { TYPES } from "@/di";
import { ConfigService } from "@/services/ConfigService";
import { Request, Response } from "express";
import { inject } from "inversify";
import {
  controller,
  httpGet,
  httpPost,
  interfaces,
  request,
  response,
} from "inversify-express-utils";

@controller("/config")
export class ConfigController implements interfaces.Controller {
  constructor(
    @inject(TYPES.ConfigService) private configService: ConfigService,
  ) {}

  @httpGet("/")
  private async index(@response() res: Response) {
    const result = await this.configService.get();
    result.caseOf({
      Left: (err) => {
        res.status(500).json({ err });
      },
      Right: (data) => {
        res.status(200).json(data);
      },
    });
  }

  @httpPost("/")
  private async create(@request() req: Request, @response() res: Response) {
    const result = await this.configService.create(req.body);
    result.caseOf({
      Left: (err) => {
        res.status(500).json({ err });
      },
      Right: () => {
        res.status(200).json({ message: "Config created" });
      },
    });
  }
}
