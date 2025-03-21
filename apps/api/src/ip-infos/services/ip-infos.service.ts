import { IpInfosResponse } from "@banalize/types";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import axios from "axios";
import * as fs from "fs";
import { open, Response } from "maxmind";
import * as path from "path";
import { IpInfosFiltersDto } from "../dtos/ip-infos-filters.dto";

@Injectable()
export class IpInfosService implements OnModuleInit {
  private readonly logger = new Logger(IpInfosService.name);
  private readonly dbPath = path.join(__dirname, "GeoLite2-City.mmdb");
  private readonly repoUrl =
    "https://api.github.com/repos/P3TERX/GeoLite.mmdb/releases/latest";

  async onModuleInit() {
    if (!fs.existsSync(this.dbPath)) {
      this.logger.log("GeoLite2-City.mmdb not found, downloading...");
      const dbUrl = await this.getLatestDbUrl();
      this.downloadDatabase(dbUrl, this.dbPath);
    } else {
      this.logger.log("GeoLite2-City.mmdb already exists, skipping download.");
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateDatabase() {
    const dbUrl = await this.getLatestDbUrl();
    this.downloadDatabase(dbUrl, this.dbPath);
  }

  async findMany({
    ips,
  }: IpInfosFiltersDto): Promise<Record<string, Partial<IpInfosResponse>>> {
    const results = await Promise.all(
      ips.map(async (ip) => {
        const info = await this.findOne(ip);
        return { ip, info };
      }),
    );

    return results.reduce(
      (acc: Record<string, Partial<IpInfosResponse>>, { ip, info }) => {
        acc[ip] = info;
        return acc;
      },
      {},
    );
  }

  async findOne(ip: string): Promise<Partial<IpInfosResponse>> {
    try {
      const lookup = await open(this.dbPath);
      return this.mapToIpInfos(lookup.get(ip));
    } catch (error) {
      this.logger.error("Error querying IP:", error);
      return {};
    }
  }

  private mapToIpInfos(response: Response): Partial<IpInfosResponse> {
    if (!response) {
      return {};
    }
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
          flag: this.getFlagEmoji(response.country.iso_code),
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

  private getFlagEmoji(countryCode: string): string {
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }
  private async getLatestDbUrl(): Promise<string> {
    try {
      const response = await axios.get(this.repoUrl);
      const assets = response.data.assets;
      const asset = assets.find(
        (a: { name: string }) => a.name === "GeoLite2-City.mmdb",
      );

      if (asset && asset.browser_download_url) {
        this.logger.log(
          `Latest database URL found: ${asset.browser_download_url}`,
        );
        return asset.browser_download_url;
      } else {
        this.logger.error(
          "GeoLite2-City.mmdb not found in the latest release.",
        );
        return "";
      }
    } catch (error) {
      this.logger.error(
        "Error fetching latest release info from GitHub:",
        error,
      );
      return "";
    }
  }

  private async downloadDatabase(url: string, dest: string): Promise<void> {
    try {
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
    } catch (error) {
      this.logger.error("Error downloading database:", error);
    }
  }
}
