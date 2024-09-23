import { Test, TestingModule } from "@nestjs/testing";
import { MatchesController } from "./matches.controller";
import { MatchSchema } from "./schemas/match.schema";
import { MatchesService } from "./services/matches.service";

describe("MatchesController", () => {
  let matchesController: MatchesController;
  let matchesService: MatchesService;

  // Mock match data
  const mockMatch: MatchSchema = {
    _id: "66dca3ca17f21044b9dbcaf5",
    line: "test 192.168.1.1 300",
    regex: "^test.*<IP>.*300$",
    ip: "192.168.1.1",
    timestamp: 1633297200000,
    configId: "66dca3ca17f21044b9dbcaf5",
  };

  const mockMatchArray = [
    {
      _id: "66dca3ca17f21044b9dbcaf5",
      line: "test 192.168.1.1 300",
      regex: "^test.*<IP>.*300$",
      ip: "192.168.1.1",
      timestamp: 1633297200000,
      configId: "66dca3ca17f21044b9dbcaf5",
    },
    {
      _id: "77dca3ca17f21044b9dbcaf6",
      line: "example 192.168.1.2 200",
      regex: "^example.*<IP>.*200$",
      ip: "192.168.1.2",
      timestamp: 1633297201000,
      configId: "77dca3ca17f21044b9dbcaf6",
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchesController],
      providers: [
        {
          provide: MatchesService,
          useValue: {
            findAll: jest.fn().mockResolvedValue(mockMatchArray),
            findOne: jest.fn().mockResolvedValue(mockMatch),
          },
        },
      ],
    }).compile();

    matchesController = module.get<MatchesController>(MatchesController);
    matchesService = module.get<MatchesService>(MatchesService);
  });

  it("should be defined", () => {
    expect(matchesController).toBeDefined();
  });

  describe("findAll", () => {
    it("should return an array of matches", async () => {
      const result = await matchesController.findAll({});
      expect(result).toEqual(mockMatchArray);
      expect(matchesService.findAll).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a single match by id", async () => {
      const result = await matchesController.findOne(
        "66dca3ca17f21044b9dbcaf5",
      );
      expect(result).toEqual(mockMatch);
      expect(matchesService.findOne).toHaveBeenCalledWith(
        "66dca3ca17f21044b9dbcaf5",
      );
    });

    it("should call findOne with the correct id", async () => {
      await matchesController.findOne("77dca3ca17f21044b9dbcaf6");
      expect(matchesService.findOne).toHaveBeenCalledWith(
        "77dca3ca17f21044b9dbcaf6",
      );
    });
  });
});
