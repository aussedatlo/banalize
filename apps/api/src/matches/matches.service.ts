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
    return this.matchEventModel.find({ ...filters }).exec();
  }

  async findOne(id: string): Promise<Match> {
    return this.matchEventModel.findOne({ _id: id }).exec();
  }

  async findAllByConfigIdAndTimestampGreaterThan(
    configId: string,
    timestamp: number,
  ): Promise<Match[]> {
    return this.matchEventModel
      .find({ configId, timestamp: { $gt: timestamp } })
      .exec();
  }
}
