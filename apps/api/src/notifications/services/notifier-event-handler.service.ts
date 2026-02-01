import { EventType, IpInfosResponse } from "@banalize/types";
import { Injectable } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { BanEvent } from "src/bans/types/ban-event.types";
import { IpInfosService } from "src/ip-infos/services/ip-infos.service";
import { MatchEvent } from "src/matches/types/match-event.types";
import { Events } from "src/shared/enums/events.enum";
import { QueuePriority } from "src/shared/enums/priority.enum";
import { QueueService } from "src/shared/services/queue.service";
import { NotifyEvent } from "../types/notify-event.types";

@Injectable()
export class NotifierEventHandlerService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly queueService: QueueService,
    private readonly ipInfosService: IpInfosService,
  ) {}

  @OnEvent(Events.BAN_CREATION_DONE)
  async handleBanCreationDone(banEvent: BanEvent) {
    this.queueService.enqueue<BanEvent>(
      banEvent,
      this.notifyBan.bind(this),
      QueuePriority.VERY_LOW,
    );
  }

  async notifyBan(banEvent: BanEvent) {
    const { ip } = banEvent;

    const geoInfo = await this.ipInfosService.findOne(ip);

    const textMessage = this.buildTextMessage(banEvent, geoInfo);
    const htmlMessage = this.buildHtmlMessage(banEvent, geoInfo);

    const notifyEvent = new NotifyEvent(
      EventType.BAN,
      "Banalize: IP Banned",
      textMessage,
      htmlMessage,
    );
    this.eventEmitter.emit(Events.NOTIFY, notifyEvent);
  }

  @OnEvent(Events.MATCH_CREATION_DONE)
  async handleMatchCreationDone(matchEvent: MatchEvent) {
    this.queueService.enqueue<MatchEvent>(
      matchEvent,
      this.notifyMatch.bind(this),
      QueuePriority.VERY_LOW,
    );
  }

  async notifyMatch(matchEvent: MatchEvent) {
    const notifyEvent = new NotifyEvent(
      EventType.MATCH,
      "Banalize: Match found",
      `[${matchEvent.config.name}] New match for IP ${matchEvent.ip}`,
    );
    this.eventEmitter.emit(Events.NOTIFY, notifyEvent);
  }

  private buildTextMessage(
    event: BanEvent,
    geo: Partial<IpInfosResponse>,
  ): string {
    const lines = [`[${event.config.name}] New ban`, `IP: ${event.ip}`];

    if (geo?.country) {
      lines.push(`Country: ${geo.country.flag} ${geo.country.name}`);
    }

    lines.push(`Regex: ${event.config.regex}`);

    if (event.line) {
      lines.push(`Log: ${event.line}`);
    }

    if (event.matchCount) {
      lines.push(`Matches: ${event.matchCount}`);
    }

    lines.push(`Time: ${new Date().toISOString()}`);

    return lines.join("\n");
  }

  private buildHtmlMessage(
    event: BanEvent,
    geo: Partial<IpInfosResponse>,
  ): string {
    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const countryRow = geo?.country
      ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Country</td>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${geo.country.flag} ${escapeHtml(geo.country.name)}</td>
            </tr>`
      : "";

    const logRow = event.line
      ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Matched Log</td>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><code style="word-break: break-all;">${escapeHtml(event.line)}</code></td>
            </tr>`
      : "";

    const matchCountRow = event.matchCount
      ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Match Count</td>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${event.matchCount}</td>
            </tr>`
      : "";

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">IP Banned</h1>
        </div>
        <div style="padding: 20px; background: #f8f9fa;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6; font-weight: bold;">IP Address</td>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${escapeHtml(event.ip)}</td>
            </tr>${countryRow}
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Configuration</td>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${escapeHtml(event.config.name)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Regex Pattern</td>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><code>${escapeHtml(event.config.regex)}</code></td>
            </tr>${logRow}${matchCountRow}
            <tr>
              <td style="padding: 10px; font-weight: bold;">Timestamp</td>
              <td style="padding: 10px;">${new Date().toISOString()}</td>
            </tr>
          </table>
        </div>
        <div style="padding: 10px; background: #e9ecef; text-align: center; font-size: 12px; color: #6c757d;">
          Banalize Notification
        </div>
      </div>
    `;
  }
}
