import { IpInfosResponse } from "@banalize/types";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import axios from "axios";
import * as fs from "fs";
import { open, Response } from "maxmind";
import * as path from "path";

@Injectable()
export class IpInfosService implements OnModuleInit {
  private readonly logger = new Logger(IpInfosService.name);
  private readonly dbPath = path.join(__dirname, "GeoLite2-City.mmdb");
  private readonly dbUrl =
    "https://github.com/P3TERX/GeoLite.mmdb/releases/download/2024.10.07/GeoLite2-City.mmdb";

  async onModuleInit() {
    if (!fs.existsSync(this.dbPath)) {
      this.logger.log("GeoLite2-City.mmdb not found, downloading...");
      await this.downloadDatabase(this.dbUrl, this.dbPath);
    } else {
      this.logger.log("GeoLite2-City.mmdb already exists, skipping download.");
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateDatabase() {
    this.downloadDatabase(this.dbUrl, this.dbPath);
  }

  async findOne(ip: string): Promise<Partial<IpInfosResponse>> {
    try {
      const lookup = await open(this.dbPath);
      return this.mapToIpInfos(lookup.get(ip));
    } catch (error) {
      this.logger.error("Error querying IP:", error);
      throw new Error("Failed to query IP address.");
    }
  }

  private mapToIpInfos(response: Response): Partial<IpInfosResponse> {
    return {
      continent:
        ("continent" in response && {
          code: response.continent.code,
          name: response.continent.names.en,
        }) ||
        undefined,
      country:
        ("country" in response && {
          iso_code: response.country.iso_code,
          name: response.country.names.en,
        }) ||
        undefined,
      location:
        ("location" in response && {
          accuracy_radius: response.location.accuracy_radius,
          latitude: response.location.latitude,
          longitude: response.location.longitude,
        }) ||
        undefined,
    };
  }

  private async downloadDatabase(url: string, dest: string): Promise<void> {
    const response = await axios({
      method: "get",
      url,
      responseType: "stream",
    });

    const file = fs.createWriteStream(dest);
    return new Promise((resolve) => {
      response.data.pipe(file);
      file.on("finish", () => {
        file.close();
        this.logger.log("Database downloaded successfully.");
        resolve();
      });

      file.on("error", (err) => {
        fs.unlink(dest, () => {});
        this.logger.error("Error downloading database:", err);
        resolve();
      });
    });
  }
}
