import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import {
  ConfigCreatedEvent,
  ConfigRemovedEvent,
} from "src/events/config-event.types";
import { Events } from "src/events/events.enum";
import { ConfigsController } from "./configs.controller";
import { ConfigsService } from "./configs.service";
import { CreateConfigDto } from "./dto/create-config.dto";
import { Config } from "./schemas/config.schema";

describe("ConfigsController", () => {
  let configsController: ConfigsController;
  let configsService: ConfigsService;
  let eventEmitter: EventEmitter2;

  const mockConfig: Config = {
    _id: "66dca3ca17f21044b9dbcaf5",
    param: "/path/file.log",
    regex: "^test.*<IP>.*300$",
    banTime: 300,
    findTime: 600,
    maxMatches: 3,
    watcherType: "file",
    ignoreIps: [],
  };

  const mockConfigArray = [mockConfig];

  const mockCreateConfigDto: CreateConfigDto = {
    param: "/path/file.log",
    regex: "^test.*<IP>.*300$",
    banTime: 300,
    findTime: 600,
    maxMatches: 3,
    watcherType: "file",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigsController],
      providers: [
        {
          provide: ConfigsService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockConfig),
            findAll: jest.fn().mockResolvedValue(mockConfigArray),
            findOne: jest.fn().mockResolvedValue(mockConfig),
            delete: jest.fn().mockResolvedValue(mockConfig),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
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
        Events.CONFIG_CREATED,
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
        Events.CONFIG_REMOVED,
        new ConfigRemovedEvent(mockConfig._id),
      );
    });
  });
});
