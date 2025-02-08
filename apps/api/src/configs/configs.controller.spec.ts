import { WatcherType } from "@banalize/types";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import {
  ConfigCreatedEvent,
  ConfigRemovedEvent,
} from "src/configs/types/config-event.types";
import { Events } from "src/shared/enums/events.enum";
import { ConfigsController } from "./configs.controller";
import { ConfigsService } from "./configs.service";
import { ConfigCreationDto } from "./dtos/config-creation-dto";
import { ConfigSchema } from "./schemas/config.schema";

describe("ConfigsController", () => {
  let configsController: ConfigsController;
  let configsService: ConfigsService;
  let eventEmitter: EventEmitter2;

  const mockConfig: ConfigSchema = {
    _id: "66dca3ca17f21044b9dbcaf5",
    param: "/path/file.log",
    regex: "^test.*<IP>.*300$",
    banTime: 300,
    findTime: 600,
    maxMatches: 3,
    watcherType: WatcherType.FILE,
    ignoreIps: [],
    name: "Test config",
    paused: false,
  };

  const mockConfigArray = [mockConfig];

  const mockCreateConfigDto: ConfigCreationDto = {
    param: "/path/file.log",
    regex: "^test.*<IP>.*300$",
    banTime: 300,
    findTime: 600,
    maxMatches: 3,
    watcherType: WatcherType.FILE,
    ignoreIps: [],
    name: "Test config",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigsController],
      providers: [
        {
          provide: ConfigsService,
          useValue: {
            create: vi.fn().mockResolvedValue(mockConfig),
            findAll: vi.fn().mockResolvedValue(mockConfigArray),
            findOne: vi.fn().mockResolvedValue(mockConfig),
            delete: vi.fn().mockResolvedValue(mockConfig),
            update: vi.fn().mockResolvedValue(mockConfig),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: vi.fn(),
          },
        },
      ],
    }).compile();

    configsController = module.get<ConfigsController>(ConfigsController);
    configsService = module.get<ConfigsService>(ConfigsService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it("should be defined", () => {
    expect(configsController).toBeDefined();
  });

  describe("create", () => {
    it("should create a config and emit an event", async () => {
      const result = await configsController.create(mockCreateConfigDto);
      expect(result).toEqual(mockConfig);
      expect(configsService.create).toHaveBeenCalledWith(mockCreateConfigDto);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        Events.CONFIG_CREATION_DONE,
        new ConfigCreatedEvent(mockConfig),
      );
    });
  });

  describe("findAll", () => {
    it("should return an array of configs", async () => {
      const result = await configsController.findAll();
      expect(result).toEqual(mockConfigArray);
      expect(configsService.findAll).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a single config by id", async () => {
      const result = await configsController.findOne(
        "66dca3ca17f21044b9dbcaf5",
      );
      expect(result).toEqual(mockConfig);
      expect(configsService.findOne).toHaveBeenCalledWith(
        "66dca3ca17f21044b9dbcaf5",
      );
    });
  });

  describe("delete", () => {
    it("should delete a config and emit an event", async () => {
      const result = await configsController.delete("66dca3ca17f21044b9dbcaf5");
      expect(result).toEqual(mockConfig);
      expect(configsService.delete).toHaveBeenCalledWith(
        "66dca3ca17f21044b9dbcaf5",
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        Events.CONFIG_REMOVE_DONE,
        new ConfigRemovedEvent(mockConfig._id),
      );
    });
  });

  describe("update", () => {
    it("should update a config and emit an event", async () => {
      const result = await configsController.update(
        "66dca3ca17f21044b9dbcaf5",
        mockCreateConfigDto,
      );
      expect(result).toEqual(mockConfig);
      expect(configsService.update).toHaveBeenCalledWith(
        "66dca3ca17f21044b9dbcaf5",
        mockCreateConfigDto,
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        Events.CONFIG_UPDATE_DONE,
        new ConfigCreatedEvent(mockConfig),
      );
    });
  });
});
