import { ConfigSchema } from "src/configs/schemas/config.schema";

export class ConfigCreatedEvent {
  constructor(public readonly config: ConfigSchema) {}
}

export class ConfigRemovedEvent {
  constructor(public readonly configId: string) {}
}

export class ConfigUpdatedEvent {
  constructor(public readonly config: ConfigSchema) {}
}
