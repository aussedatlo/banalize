export class ConfigCreatedEvent {
  constructor(public readonly config: any) {}
}

export class ConfigRemovedEvent {
  constructor(public readonly configId: string) {}
}
