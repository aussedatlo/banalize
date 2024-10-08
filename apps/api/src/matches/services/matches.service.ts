import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { MatchCreationDto } from "../dtos/match-creation.dto";
import { MatchFiltersDto } from "../dtos/match-filters.dto";
import { MatchSchema } from "../schemas/match.schema";

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(MatchSchema.name)
    private readonly matchEventModel: Model<MatchSchema>,
  ) {}

  async create(createMatchEventDto: MatchCreationDto): Promise<MatchSchema> {
    return await this.matchEventModel.create(createMatchEventDto);
  }

  async findAll(filters: MatchFiltersDto): Promise<MatchSchema[]> {
    const { timestamp_gt, ...otherFilters } = filters;
    return this.matchEventModel
      .find({ ...otherFilters, timestamp: { $gt: timestamp_gt ?? 0 } })
      .exec();
  }

  async findOne(id: string): Promise<MatchSchema> {
    return this.matchEventModel.findOne({ _id: id }).exec();
  }
}
