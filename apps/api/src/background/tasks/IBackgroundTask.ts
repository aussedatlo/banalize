export interface IBackgroundTask {
  execute(): Promise<void>;
}
