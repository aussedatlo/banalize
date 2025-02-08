import { EventType, NotifierConfigSchema } from "@banalize/types";
import { Test, TestingModule } from "@nestjs/testing";
import { NotifierConfigDto as NotifierConfigCreationDto } from "./dtos/notifier-config-creation.dto";
import { NotificationsController } from "./notifications.controller";
import { NotifierConfigService } from "./services/notifier-config-service.service";
import { NotifierTestService } from "./services/notifier-test-service.service";

describe("NotificationsController", () => {
  let notificationsController: NotificationsController;
  let notifierConfigService: NotifierConfigService;
  let notifierTestService: NotifierTestService;

  const mockConfig = {
    _id: "config123",
    name: "Test Config",
    enabled: true,
  };

  const mockConfigArray = [mockConfig, mockConfig];

  const mockNotifierConfigService = {
    findAll: vi.fn().mockResolvedValue(mockConfigArray),
    findOne: vi.fn().mockResolvedValue(mockConfig),
    create: vi.fn().mockResolvedValue(mockConfig),
    update: vi.fn().mockResolvedValue(mockConfig),
    delete: vi.fn().mockResolvedValue({ deleted: true }),
  };

  const mockNotifierTestService = {
    execute: vi.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotifierConfigService,
          useValue: mockNotifierConfigService,
        },
        {
          provide: NotifierTestService,
          useValue: mockNotifierTestService,
        },
      ],
    }).compile();

    notificationsController = module.get<NotificationsController>(
      NotificationsController,
    );
    notifierConfigService = module.get<NotifierConfigService>(
      NotifierConfigService,
    );
    notifierTestService = module.get<NotifierTestService>(NotifierTestService);
  });

  it("should be defined", () => {
    expect(notificationsController).toBeDefined();
  });

  describe("findAll", () => {
    it("should return all notification configs", async () => {
      const result = await notificationsController.findAll();
      expect(result).toEqual(mockConfigArray);
      expect(notifierConfigService.findAll).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a single notification config by ID", async () => {
      const result = await notificationsController.findOne("config123");
      expect(result).toEqual(mockConfig);
      expect(notifierConfigService.findOne).toHaveBeenCalledWith("config123");
    });
  });

  describe("create", () => {
    it("should create a new notification config", async () => {
      const dto: NotifierConfigCreationDto = { events: [EventType.BAN] };
      const result = await notificationsController.create(dto);
      expect(result).toEqual(mockConfig);
      expect(notifierConfigService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe("update", () => {
    it("should update a notification config", async () => {
      const dto: NotifierConfigSchema = {
        _id: "config123",
        events: [EventType.BAN, EventType.MATCH],
      };
      const result = await notificationsController.update("config123", dto);
      expect(result).toEqual(mockConfig);
      expect(notifierConfigService.update).toHaveBeenCalledWith(
        "config123",
        dto,
      );
    });
  });

  describe("delete", () => {
    it("should delete a notification config", async () => {
      const result = await notificationsController.delete("config123");
      expect(result).toEqual({ deleted: true });
      expect(notifierConfigService.delete).toHaveBeenCalledWith("config123");
    });
  });

  describe("test", () => {
    it("should execute a test notification", async () => {
      const result = await notificationsController.test("config123");
      expect(result).toEqual({ success: true });
      expect(notifierTestService.execute).toHaveBeenCalledWith("config123");
    });
  });
});
