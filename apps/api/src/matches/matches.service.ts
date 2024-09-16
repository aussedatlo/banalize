import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CreateMatchDto } from "./dto/create-match.dto";
import { FiltersMatchesDto } from "./dto/filters-match.dto";
import { Match } from "./schemas/match";

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(Match.name)
    private readonly matchEventModel: Model<Match>,
  ) {}

  async create(createMatchEventDto: CreateMatchDto): Promise<Match> {
    return await this.matchEventModel.create(createMatchEventDto);
  }

  async findAll(filters: FiltersMatchesDto): Promise<Match[]> {
    const { timestamp_gt, ...otherFilters } = filters;
    return this.matchEventModel
      .find({ ...otherFilters, timestamp: { $gt: timestamp_gt ?? 0 } })
      .exec();
  }

  async findOne(id: string): Promise<Match> {
    return this.matchEventModel.findOne({ _id: id }).exec();
  }
}
