import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ConfigCreationDto } from "./dtos/config-creation-dto";
import { ConfigSchema } from "./schemas/config.schema";

@Injectable()
export class ConfigsService {
  constructor(
    @InjectModel(ConfigSchema.name)
    private readonly configModel: Model<ConfigSchema>,
  ) {}

  async create(createConfigDto: ConfigCreationDto): Promise<ConfigSchema> {
    const createdCat = await this.configModel.create({
      ...createConfigDto,
      ignoreIps: createConfigDto.ignoreIps || [],
    });
    return createdCat;
  }

  async findAll(): Promise<ConfigSchema[]> {
    return this.configModel.find().exec();
  }

  async findOne(id: string): Promise<ConfigSchema> {
    return this.configModel.findOne({ _id: id }).exec();
  }

  async delete(id: string): Promise<ConfigSchema> {
    const deletedConfig = await this.configModel
      .findByIdAndDelete({ _id: id })
      .exec();
    return deletedConfig;
  }

  async update(
    id: string,
    createConfigDto: ConfigCreationDto,
  ): Promise<ConfigSchema> {
    const updatedConfig = await this.configModel
      .findByIdAndUpdate({ _id: id }, createConfigDto, { new: true })
      .exec();
    return updatedConfig;
  }
}
