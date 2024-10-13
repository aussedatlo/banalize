import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BanCreationDto } from "../dtos/ban-creation.dto";
import { BanFiltersDto } from "../dtos/ban-filters.dto";
import { BanModificationDto } from "../dtos/ban-modification.dto";
import { BanSchema } from "../schemas/ban.schema";

@Injectable()
export class BansService {
  constructor(
    @InjectModel(BanSchema.name)
    private readonly banEventModel: Model<BanSchema>,
  ) {}

  // create and set active to true
  async create(createBanDto: BanCreationDto): Promise<BanSchema> {
    return this.banEventModel.create({ ...createBanDto, active: true });
  }

  async update(
    id: string,
    updateBanDto: BanModificationDto,
  ): Promise<BanSchema> {
    return this.banEventModel.findByIdAndUpdate(id, updateBanDto).exec();
  }

  async findAll(
    filters: BanFiltersDto,
  ): Promise<{ bans: BanSchema[]; totalCount: number }> {
    const { page = 1, limit, ...restFilters } = filters;

    // Handle limit = 0 case explicitly (return no bans, but still count total)
    if (limit === 0) {
      const totalCount = await this.banEventModel
        .countDocuments({ ...restFilters })
        .exec();
      return { bans: [], totalCount };
    }

    // Calculate the number of documents to skip for pagination
    const skip = limit ? (page - 1) * limit : 0;
    const banQuery = this.banEventModel.find({ ...restFilters });

    // Apply pagination only if limit is provided (skip if undefined)
    if (limit !== undefined) {
      banQuery.skip(skip).limit(limit);
    }

    // Execute the queries concurrently
    const bansPromise = banQuery.exec();
    const totalCountPromise = this.banEventModel
      .countDocuments({ ...restFilters })
      .exec();

    const [bans, totalCount] = await Promise.all([
      bansPromise,
      totalCountPromise,
    ]);

    return { bans, totalCount };
  }

  async findOne(id: string): Promise<BanSchema> {
    return this.banEventModel.findOne({ _id: id }).exec();
  }
}
