import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UnbanCreationDto } from "src/unbans/dtos/unban-creation.dto";
import { UnbanFiltersDto } from "src/unbans/dtos/unban-filters.dto";
import { UnbanSchema } from "src/unbans/schemas/unban.schema";

@Injectable()
export class UnbansService {
  constructor(
    @InjectModel(UnbanSchema.name)
    private readonly unbanEventModel: Model<UnbanSchema>,
  ) {}

  async create(createUnbanDto: UnbanCreationDto): Promise<UnbanSchema> {
    return this.unbanEventModel.create(createUnbanDto);
  }

  async findAll(filters: UnbanFiltersDto): Promise<UnbanSchema[]> {
    return this.unbanEventModel.find({ ...filters }).exec();
  }

  async findOne(id: string): Promise<UnbanSchema> {
    return this.unbanEventModel.findOne({ _id: id }).exec();
  }
}
