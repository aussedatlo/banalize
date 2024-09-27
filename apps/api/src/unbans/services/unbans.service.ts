import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CreateUnbanDto } from "src/unbans/dto/create-unban.dto";
import { FiltersUnbansDto } from "src/unbans/dto/filters-ban.dto";
import { UnbanSchema } from "src/unbans/schemas/unban.schema";

@Injectable()
export class UnbansService {
  constructor(
    @InjectModel(UnbanSchema.name)
    private readonly unbanEventModel: Model<UnbanSchema>,
  ) {}

  async create(createUnbanDto: CreateUnbanDto): Promise<UnbanSchema> {
    return this.unbanEventModel.create(createUnbanDto);
  }

  async findAll(filters: FiltersUnbansDto): Promise<UnbanSchema[]> {
    return this.unbanEventModel.find({ ...filters }).exec();
  }

  async findOne(id: string): Promise<UnbanSchema> {
    return this.unbanEventModel.findOne({ _id: id }).exec();
  }
}
