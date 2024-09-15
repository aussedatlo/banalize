import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CreateBanDto, UpdateBanDto } from "./dto/create-ban.dto";
import { FiltersBansDto } from "./dto/filters-ban.dto";
import { Ban } from "./schemas/ban.schema";

@Injectable()
export class BansService {
  constructor(
    @InjectModel(Ban.name)
    private readonly banEventModel: Model<Ban>,
  ) {}

  // create and set active to true
  async create(createBanDto: CreateBanDto): Promise<Ban> {
    return this.banEventModel.create({ ...createBanDto, active: true });
  }

  async update(id: string, updateBanDto: UpdateBanDto): Promise<Ban> {
    return this.banEventModel.findByIdAndUpdate(id, updateBanDto).exec();
  }

  async findAll(filters: FiltersBansDto): Promise<Ban[]> {
    return this.banEventModel.find({ ...filters }).exec();
  }

  async findOne(id: string): Promise<Ban> {
    return this.banEventModel.findOne({ _id: id }).exec();
  }
}
