import { ConfigSchema } from "@banalize/types";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import { BanEvent } from "src/bans/types/ban-event.types";
import { ConfigsService } from "src/configs/configs.service";
import { Events } from "src/shared/enums/events.enum";
import { QueuePriority } from "src/shared/enums/priority.enum";
import { QueueService } from "src/shared/services/queue.service";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MatchEvent } from "../types/match-event.types";
import { MatchEventHandlerService } from "./match-event-handler.service";
import { MatchesService } from "./matches.service";

describe("MatchEventHandlerService", () => {
  let service: MatchEventHandlerService;
  let matchesService: MatchesService;
  let eventEmitter: EventEmitter2;
  let queueService: QueueService;

  const mockMatchesService = {
    findAll: vi.fn().mockResolvedValue({ matches: [], totalCount: 0 }),
    create: vi.fn(),
  };

  const mockConfigsService = {
    findAll: vi.fn().mockResolvedValue([]),
  };

  const mockEventEmitter = {
    emit: vi.fn(),
  };

  const mockQueueService = {
    enqueue: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchEventHandlerService,
        {
          provide: MatchesService,
          useValue: mockMatchesService,
        },
        {
          provide: ConfigsService,
          useValue: mockConfigsService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
      ],
    }).compile();

    service = module.get<MatchEventHandlerService>(MatchEventHandlerService);
    matchesService = module.get<MatchesService>(MatchesService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    queueService = module.get<QueueService>(QueueService);

    vi.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("handleMatchCreationRequested", () => {
    it("should enqueue event with high priority", () => {
      const event = new MatchEvent("test line", "192.168.1.1", {
        _id: "123",
        name: "test",
        param: "test",
        regex: "test",
        banTime: 3600,
        maxMatches: 5,
        ignoreIps: [],
        findTime: 1000,
        watcherType: "test",
      } as ConfigSchema);

      service.handleMatchCreationRequested(event);

      expect(queueService.enqueue).toHaveBeenCalledWith(
        event,
        service.handleCacheAndImmediateCheck,
        QueuePriority.HIGH,
      );
    });
  });

  describe("handleCacheAndImmediateCheck", () => {
    it("should not ban if below threshold", async () => {
      const event = new MatchEvent("test line", "192.168.1.1", {
        _id: "123",
        name: "test",
        param: "test",
        regex: "test",
        banTime: 3600,
        maxMatches: 5,
        ignoreIps: ["192.168.1.1"],
        findTime: 1000,
        watcherType: "test",
      } as ConfigSchema);

      await service.handleCacheAndImmediateCheck(event);

      expect(queueService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ banned: false }),
        service.createMatch,
        QueuePriority.MEDIUM,
      );
    });

    it("should ban when threshold reached in cache", async () => {
      const event = new MatchEvent("test line", "192.168.1.1", {
        _id: "123",
        name: "test",
        param: "test",
        regex: "test",
        banTime: 3600,
        maxMatches: 1,
        ignoreIps: [],
        findTime: 1000,
        watcherType: "test",
      } as ConfigSchema);

      await service.handleCacheAndImmediateCheck(event);

      expect(eventEmitter.emit).toHaveBeenCalledWith(Events.FIREWALL_DENY, {
        ip: "192.168.1.1",
      });
      expect(queueService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ banned: true }),
        service.createMatch,
        QueuePriority.MEDIUM,
      );
    });

    it("should ban if 3 events arrive at the same time", async () => {
      const config = {
        _id: "123",
        name: "test",
        param: "test",
        regex: "test",
        banTime: 3600,
        maxMatches: 3,
        ignoreIps: [],
        findTime: 1000,
        watcherType: "test",
      } as ConfigSchema;

      const event1 = new MatchEvent("test line 1", "192.168.1.1", config);
      const event2 = new MatchEvent("test line 2", "192.168.1.1", config);
      const event3 = new MatchEvent("test line 3", "192.168.1.1", config);

      mockMatchesService.findAll.mockResolvedValue({ totalCount: 0 });

      await service.handleCacheAndImmediateCheck(event1);
      await service.handleCacheAndImmediateCheck(event2);
      await service.handleCacheAndImmediateCheck(event3);

      expect(eventEmitter.emit).toHaveBeenCalledWith(Events.FIREWALL_DENY, {
        ip: "192.168.1.1",
      });
      expect(queueService.enqueue).toHaveBeenLastCalledWith(
        expect.objectContaining({ banned: true }),
        service.createMatch,
        QueuePriority.MEDIUM,
      );
    });

    it("should not ban if less than 3 events arrive at the same time", async () => {
      const config = {
        _id: "123",
        name: "test",
        param: "test",
        regex: "test",
        banTime: 3600,
        maxMatches: 3,
        ignoreIps: [],
        findTime: 1000,
        watcherType: "test",
      } as ConfigSchema;

      const event1 = new MatchEvent("test line 1", "192.168.1.1", config);
      const event2 = new MatchEvent("test line 2", "192.168.1.1", config);

      mockMatchesService.findAll.mockResolvedValue({ totalCount: 0 });

      await service.handleCacheAndImmediateCheck(event1);
      await service.handleCacheAndImmediateCheck(event2);

      expect(eventEmitter.emit).not.toHaveBeenCalledWith(Events.FIREWALL_DENY, {
        ip: "192.168.1.1",
      });
      expect(queueService.enqueue).toHaveBeenLastCalledWith(
        expect.objectContaining({ banned: false }),
        service.createMatch,
        QueuePriority.MEDIUM,
      );
    });

    it("should ban if 2 events arrive for maxMatches=2", async () => {
      const config = {
        _id: "123",
        name: "test",
        param: "test",
        regex: "test",
        banTime: 3600,
        maxMatches: 2,
        ignoreIps: [],
        findTime: 1000,
        watcherType: "test",
      } as ConfigSchema;

      const event1 = new MatchEvent("test line 1", "192.168.1.1", config);
      const event2 = new MatchEvent("test line 2", "192.168.1.1", config);

      await service.handleCacheAndImmediateCheck(event1);
      await service.handleCacheAndImmediateCheck(event2);

      expect(eventEmitter.emit).toHaveBeenCalledWith(Events.FIREWALL_DENY, {
        ip: "192.168.1.1",
      });
      expect(queueService.enqueue).toHaveBeenLastCalledWith(
        expect.objectContaining({ banned: true }),
        service.createMatch,
        QueuePriority.MEDIUM,
      );
    });
  });

  describe("createMatch", () => {
    it("should create match and emit events for banned IP", async () => {
      const event = new MatchEvent(
        "test line",
        "192.168.1.1",
        {
          _id: "123",
          name: "test",
          param: "test",
          regex: "test",
          banTime: 3600,
          maxMatches: 5,
          ignoreIps: [],
          findTime: 1000,
          watcherType: "test",
        } as ConfigSchema,
        Date.now(),
        true, // banned
      );

      await service.createMatch(event);

      expect(matchesService.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        Events.BAN_CREATION_REQUESTED,
        expect.any(BanEvent),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        Events.MATCH_CREATION_DONE,
        event,
      );
    });

    it("should handle ignored matches", async () => {
      const event = new MatchEvent(
        "test line",
        "192.168.1.1",
        {
          _id: "123",
          name: "test",
          param: "test",
          regex: "test",
          banTime: 3600,
          maxMatches: 5,
          ignoreIps: ["192.168.1.1"], // ignored IP
        } as ConfigSchema,
        Date.now(),
        true, // banned
      );

      await service.createMatch(event);

      expect(matchesService.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        Events.MATCH_CREATION_DONE,
        event,
      );
      expect(eventEmitter.emit).not.toHaveBeenCalledWith(
        Events.BAN_CREATION_REQUESTED,
        expect.any(BanEvent),
      );
    });
  });
});
