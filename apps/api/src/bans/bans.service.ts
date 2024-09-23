import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CreateBanDto } from "./dto/create-ban.dto";
import { FiltersBansDto } from "./dto/filters-ban.dto";
import { UpdateBanDto } from "./dto/update-ban.dto";
import { BanSchema } from "./schemas/ban.schema";

@Injectable()
export class BansService {
  constructor(
    @InjectModel(BanSchema.name)
    private readonly banEventModel: Model<BanSchema>,
  ) {}

  // create and set active to true
  async create(createBanDto: CreateBanDto): Promise<BanSchema> {
    return this.banEventModel.create({ ...createBanDto, active: true });
  }

  async update(id: string, updateBanDto: UpdateBanDto): Promise<BanSchema> {
    return this.banEventModel.findByIdAndUpdate(id, updateBanDto).exec();
  }

  async findAll(filters: FiltersBansDto): Promise<BanSchema[]> {
    return this.banEventModel.find({ ...filters }).exec();
  }

  async findOne(id: string): Promise<BanSchema> {
    return this.banEventModel.findOne({ _id: id }).exec();
  }
}
