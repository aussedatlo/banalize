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
    findAll: vi.fn(),
    create: vi.fn(),
  };

  const mockEventEmitter = {
    emit: vi.fn(),
  };

  const mockQueueService = {
    enqueue: vi.fn(),
  };

  const mockConfigsService = {
    findAll: vi.fn().mockResolvedValue([]),
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
    it("should handle ignored IPs", async () => {
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

      // handleCacheAndImmediateCheck doesn't check for ignored IPs,
      // it just enqueues the event. The ignored check happens in createMatch.
      expect(queueService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ banned: false }),
        service.createMatch,
        QueuePriority.MEDIUM,
      );
    });

    it("should handle cache miss and ban IP when threshold reached", async () => {
      const config = {
        _id: "123",
        name: "test",
        param: "test",
        regex: "test",
        banTime: 3600,
        maxMatches: 5,
        ignoreIps: [],
        findTime: 1000,
        watcherType: "test",
      } as ConfigSchema;

      // The service uses in-memory cache, so we need to call handleCacheAndImmediateCheck
      // 5 times (maxMatches) to trigger the ban
      const event1 = new MatchEvent("test line 1", "192.168.1.1", config);
      const event2 = new MatchEvent("test line 2", "192.168.1.1", config);
      const event3 = new MatchEvent("test line 3", "192.168.1.1", config);
      const event4 = new MatchEvent("test line 4", "192.168.1.1", config);
      const event5 = new MatchEvent("test line 5", "192.168.1.1", config);

      await service.handleCacheAndImmediateCheck(event1);
      await service.handleCacheAndImmediateCheck(event2);
      await service.handleCacheAndImmediateCheck(event3);
      await service.handleCacheAndImmediateCheck(event4);
      await service.handleCacheAndImmediateCheck(event5);

      expect(eventEmitter.emit).toHaveBeenCalledWith(Events.FIREWALL_DENY, {
        ip: "192.168.1.1",
      });
      expect(queueService.enqueue).toHaveBeenLastCalledWith(
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

    it("should ban if 2 events arrive at the same time with already one match on database", async () => {
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

      // The service uses in-memory cache, not database
      // To simulate "already one match on database", we add one match to the cache first
      const event0 = new MatchEvent("test line 0", "192.168.1.1", config);
      await service.handleCacheAndImmediateCheck(event0);

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

    it("should ban if 1 event arrive at the same time with already two matches on database", async () => {
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

      // The service uses in-memory cache, not database
      // To simulate "already two matches on database", we add two matches to the cache first
      const event0 = new MatchEvent("test line 0", "192.168.1.1", config);
      const event1 = new MatchEvent("test line 1", "192.168.1.1", config);
      await service.handleCacheAndImmediateCheck(event0);
      await service.handleCacheAndImmediateCheck(event1);

      const event2 = new MatchEvent("test line 2", "192.168.1.1", config);
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

    it("should not ban if 1 event arrive at the same time with already one match on database", async () => {
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

      // The service uses in-memory cache, not database
      // To simulate "already one match on database", we add one match to the cache first
      const event0 = new MatchEvent("test line 0", "192.168.1.1", config);
      await service.handleCacheAndImmediateCheck(event0);

      const event = new MatchEvent("test line 1", "192.168.1.1", config);
      await service.handleCacheAndImmediateCheck(event);

      expect(eventEmitter.emit).not.toHaveBeenCalledWith(Events.FIREWALL_DENY, {
        ip: "192.168.1.1",
      });
      expect(queueService.enqueue).toHaveBeenLastCalledWith(
        expect.objectContaining({ banned: false }),
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
          ignoreIps: ["192.168.1.1"], // IP is in ignore list
        } as ConfigSchema,
        Date.now(),
        false, // banned (but will be ignored anyway)
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
