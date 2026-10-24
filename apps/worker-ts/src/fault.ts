export class Fault extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly fileID?: string,
  ) {
    super(message);
  }
}
export const notFound = () => new Fault("not_found", "资源不存在");
