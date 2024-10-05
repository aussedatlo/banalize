import { Test, TestingModule } from "@nestjs/testing";
import { BansController } from "./bans.controller";
import { BansService } from "./bans.service";
import { BanSchema } from "./schemas/ban.schema";

describe("BansController", () => {
  let bansController: BansController;
  let bansService: BansService;

  // Mock data
  const mockBan: BanSchema = {
    _id: "123",
    ip: "192.168.1.1",
    timestamp: 1633297200000,
    configId: "config123",
    active: true,
  };

  const mockBanArray: BanSchema[] = [
    {
      _id: "123",
      ip: "192.168.1.1",
      timestamp: 1633297200000,
      configId: "config123",
      active: true,
    },
    {
      _id: "456",
      ip: "192.168.1.2",
      timestamp: 1633297200000,
      configId: "config456",
      active: false,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BansController],
      providers: [
        {
          provide: BansService,
          useValue: {
            findAll: jest.fn().mockResolvedValue(mockBanArray),
            findOne: jest.fn().mockResolvedValue(mockBan),
          },
        },
      ],
    }).compile();

    bansController = module.get<BansController>(BansController);
    bansService = module.get<BansService>(BansService);
  });

  it("should be defined", () => {
    expect(bansController).toBeDefined();
  });

  describe("findAll", () => {
    it("should return an array of bans", async () => {
      const result = await bansController.findAll({});
      expect(result).toEqual(mockBanArray);
      expect(bansService.findAll).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a single ban by id", async () => {
      const result = await bansController.findOne("123");
      expect(result).toEqual(mockBan);
      expect(bansService.findOne).toHaveBeenCalledWith("123");
    });

    it("should call findOne with the correct id", async () => {
      await bansController.findOne("456");
      expect(bansService.findOne).toHaveBeenCalledWith("456");
    });
  });
});
