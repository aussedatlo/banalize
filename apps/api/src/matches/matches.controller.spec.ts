import { Test, TestingModule } from "@nestjs/testing";
import type { Response } from "express";
import { MatchFiltersDto } from "./dtos/match-filters.dto";
import { MatchesController } from "./matches.controller";
import { MatchSchema } from "./schemas/match.schema";
import { MatchesService } from "./services/matches.service";

describe("MatchesController", () => {
  let matchesController: MatchesController;
  let matchesService: MatchesService;

  const mockMatch: MatchSchema = {
    _id: "123",
    ip: "192.168.1.1",
    timestamp: new Date().getTime(),
    configId: "config123",
    line: "test line",
    regex: "test regex",
  };

  const mockMatchArray = [mockMatch, mockMatch];

  const mockMatchesService = {
    findAll: vi
      .fn()
      .mockResolvedValue({ matches: mockMatchArray, totalCount: 2 }),
    findOne: vi.fn().mockResolvedValue(mockMatch),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchesController],
      providers: [
        {
          provide: MatchesService,
          useValue: mockMatchesService,
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
    it("should return all matches and set header", async () => {
      const mockResponse = {
        setHeader: vi.fn(),
        json: vi.fn(),
      } as unknown as Response;

      const filters: MatchFiltersDto = {};

      await matchesController.findAll(filters, mockResponse);

      expect(matchesService.findAll).toHaveBeenCalledWith(filters);
      expect(mockResponse.setHeader).toHaveBeenCalledWith("X-Total-Count", 2);
      expect(mockResponse.json).toHaveBeenCalledWith(mockMatchArray);
    });
  });

  describe("findOne", () => {
    it("should return a single match by ID", async () => {
      const result = await matchesController.findOne("123");

      expect(result).toEqual(mockMatch);
      expect(matchesService.findOne).toHaveBeenCalledWith("123");
    });
  });
});
