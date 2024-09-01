import * as child_process from "child_process";
import { Left, Right } from "purify-ts";
import { IPTablesService } from "./IPTablesService";

jest.mock("child_process");

describe("IPTablesService", () => {
  let spy: jest.SpyInstance;
  let service: IPTablesService;
  const ip = "192.168.1.1";

  beforeEach(() => {
    jest.clearAllMocks();
    spy = jest.spyOn(child_process, "exec");
    service = new IPTablesService();
  });

  describe("ban function", () => {
    it("should ban an IP", async () => {
      // GIVEN
      spy.mockImplementation((command, cb) => cb(null, "", ""));

      // WHEN
      const result = await service.ban(ip);

      // THEN
      expect(result).toEqual(Right(true));
      expect(spy).toHaveBeenCalledWith(
        `iptables -A INPUT -s ${ip} -j REJECT --reject-with icmp-port-unreachable`,
        expect.any(Function),
      );
    });

    it("should return an error if the command fails", async () => {
      // GIVEN
      spy.mockImplementation((command, cb) => cb(new Error("error"), "", ""));

      // WHEN
      const result = await service.ban(ip);

      // THEN
      expect(result).toEqual(Left(new Error("error")));
    });

    it("should return an error if the command throws an error", async () => {
      // GIVEN
      spy.mockImplementation(() => {
        throw new Error("error");
      });

      // WHEN
      const result = await service.ban(ip);

      // THEN
      expect(result).toEqual(Left(new Error("error")));
    });
  });

  describe("unban function", () => {
    it("should unban an IP", async () => {
      // GIVEN
      spy.mockImplementation((command, cb) => cb(null, "", ""));

      // WHEN
      const result = await service.unban(ip);

      // THEN
      expect(result).toEqual(Right(true));
      expect(spy).toHaveBeenCalledWith(
        `iptables -D INPUT -s ${ip} -j REJECT --reject-with icmp-port-unreachable`,
        expect.any(Function),
      );
    });

    it("should return an error if the command fails", async () => {
      // GIVEN
      spy.mockImplementation((command, cb) => cb(new Error("error"), "", ""));

      // WHEN
      const result = await service.unban(ip);

      // THEN
      expect(result).toEqual(Left(new Error("error")));
    });

    it("should return an error if the command throws an error", async () => {
      // GIVEN
      spy.mockImplementation(() => {
        throw new Error("error");
      });

      // WHEN
      const result = await service.unban(ip);

      // THEN
      expect(result).toEqual(Left(new Error("error")));
    });
  });
});
