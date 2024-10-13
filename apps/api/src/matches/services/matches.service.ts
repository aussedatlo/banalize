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

  async findAll(
    filters: MatchFiltersDto,
  ): Promise<{ matches: MatchSchema[]; totalCount: number }> {
    const { page = 1, limit, timestamp_gt, ...otherFilters } = filters;

    // Build the filter object, applying timestamp filter if provided
    const filterQuery = {
      ...otherFilters,
      timestamp: { $gt: timestamp_gt ?? 0 }, // Apply the timestamp filter (defaults to 0 if not provided)
    };

    // If limit is 0, return no results but still count total
    if (limit === 0) {
      const totalCount = await this.matchEventModel
        .countDocuments(filterQuery)
        .exec();
      return { matches: [], totalCount };
    }

    // Pagination setup: skip based on the page and limit
    const skip = limit ? (page - 1) * limit : 0;

    // Apply the filter and pagination
    const matchesQuery = this.matchEventModel.find(filterQuery);

    // Apply skip and limit if limit is provided
    if (limit !== undefined) {
      matchesQuery.skip(skip).limit(limit);
    }

    // Execute the queries concurrently
    const matchesPromise = matchesQuery.exec();
    const totalCountPromise = this.matchEventModel
      .countDocuments(filterQuery)
      .exec();

    const [matches, totalCount] = await Promise.all([
      matchesPromise,
      totalCountPromise,
    ]);

    return { matches, totalCount };
  }

  async findOne(id: string): Promise<MatchSchema> {
    return this.matchEventModel.findOne({ _id: id }).exec();
  }
}
