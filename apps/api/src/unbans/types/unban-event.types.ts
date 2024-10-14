export class UnbanEvent {
  constructor(
    public readonly ip: string,
    public readonly configId: string,
    public readonly banId: string,
  ) {}
}
