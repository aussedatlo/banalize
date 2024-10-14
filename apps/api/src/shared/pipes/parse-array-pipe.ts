import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from "@nestjs/common";

@Injectable()
export class ParseArrayPipe implements PipeTransform {
  transform(value, _metadata: ArgumentMetadata) {
    if (typeof value === "string") {
      return value.split(",").map((ip: string) => ip.trim());
    }

    if (Array.isArray(value)) {
      return value;
    }

    throw new BadRequestException("Invalid array format");
  }
}
