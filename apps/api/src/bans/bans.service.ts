import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BanCreationDto } from "./dtos/ban-creation.dto";
import { BanFiltersDto } from "./dtos/ban-filters.dto";
import { BanModificationDto } from "./dtos/ban-modification.dto";
import { BanSchema } from "./schemas/ban.schema";

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

  async findAll(filters: BanFiltersDto): Promise<BanSchema[]> {
    return this.banEventModel.find({ ...filters }).exec();
  }

  async findOne(id: string): Promise<BanSchema> {
    return this.banEventModel.findOne({ _id: id }).exec();
  }
}
