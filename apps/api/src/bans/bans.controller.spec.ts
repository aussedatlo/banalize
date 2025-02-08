import { ConfigSchema } from "@banalize/types";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import { type Response } from "express";
import { Events } from "src/shared/enums/events.enum";
import { UnbanEvent } from "src/unbans/types/unban-event.types";
import { ConfigsService } from "../configs/configs.service";
import { BansController } from "./bans.controller";
import { BanCreationDto } from "./dtos/ban-creation.dto";
import { BanFiltersDto } from "./dtos/ban-filters.dto";
import { BanSchema } from "./schemas/ban.schema";
import { BansService } from "./services/bans.service";
import { BanEvent } from "./types/ban-event.types";

describe("BansController", () => {
  let bansController: BansController;
  let bansService: BansService;
  let configsService: ConfigsService;
  let eventEmitter: EventEmitter2;

  const mockBan: BanSchema = {
    _id: "123",
    ip: "192.168.1.1",
    timestamp: new Date().getTime(),
    configId: "config123",
    active: true,
  };

  const mockConfig = {
    _id: "config123",
    name: "Test Config",
  } as ConfigSchema;

  const mockBansArray = [mockBan, mockBan];

  const mockBansService = {
    create: vi.fn().mockResolvedValue(mockBan),
    findAll: vi.fn().mockResolvedValue({
      bans: mockBansArray,
      totalCount: mockBansArray.length,
    }),
    findOne: vi.fn().mockResolvedValue(mockBan),
    update: vi.fn().mockResolvedValue({ ...mockBan, active: false }),
  };

  const mockConfigsService = {
    findOne: vi.fn().mockResolvedValue(mockConfig),
  };

  const mockEventEmitter = {
    emit: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BansController],
      providers: [
        {
          provide: BansService,
          useValue: mockBansService,
        },
        {
          provide: ConfigsService,
          useValue: mockConfigsService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    bansController = module.get<BansController>(BansController);
    bansService = module.get<BansService>(BansService);
    configsService = module.get<ConfigsService>(ConfigsService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it("should be defined", () => {
    expect(bansController).toBeDefined();
  });

  describe("create", () => {
    it("should create a ban and emit events", async () => {
      const dto: BanCreationDto = {
        ip: "192.168.1.1",
        timestamp: new Date().getTime(),
        configId: "config123",
      };

      const result = await bansController.create(dto);

      expect(configsService.findOne).toHaveBeenCalledWith("config123");
      expect(bansService.create).toHaveBeenCalledWith({
        ip: "192.168.1.1",
        timestamp: dto.timestamp,
        configId: mockConfig._id,
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        Events.BAN_CREATION_DONE,
        new BanEvent(mockBan.ip, mockConfig),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(Events.FIREWALL_DENY, {
        ip: mockBan.ip,
      });
      expect(result).toEqual(mockBan);
    });

    it("should throw an error if config is not found", async () => {
      mockConfigsService.findOne.mockResolvedValueOnce(null);

      const dto: BanCreationDto = {
        ip: "192.168.1.1",
        timestamp: new Date().getTime(),
        configId: "invalidConfig",
      };

      await expect(bansController.create(dto)).rejects.toThrow(
        "Config not found",
      );
    });
  });

  describe("findAll", () => {
    it("should return all bans and set header", async () => {
      const mockResponse = {
        setHeader: vi.fn(),
        json: vi.fn(),
      } as unknown as Response;

      const filters: BanFiltersDto = {};

      await bansController.findAll(filters, mockResponse);

      expect(bansService.findAll).toHaveBeenCalledWith(filters);
      expect(mockResponse.setHeader).toHaveBeenCalledWith("X-Total-Count", 2);
      expect(mockResponse.json).toHaveBeenCalledWith(mockBansArray);
    });
  });

  describe("findOne", () => {
    it("should return a single ban by ID", async () => {
      const result = await bansController.findOne("123");

      expect(result).toEqual(mockBan);
      expect(bansService.findOne).toHaveBeenCalledWith("123");
    });
  });

  describe("disable", () => {
    it("should disable a ban and emit an event", async () => {
      const result = await bansController.disable("123");

      expect(bansService.update).toHaveBeenCalledWith("123", { active: false });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        Events.UNBAN_CREATE_REQUESTED,
        new UnbanEvent(mockBan.ip, mockBan.configId, mockBan._id),
      );
      expect(result).toEqual({ ...mockBan, active: false });
    });
  });
});
