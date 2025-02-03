import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import * as ChildProcess from "child_process";
import { Events } from "src/shared/enums/events.enum";
import { IptablesFirewallService } from "./iptables-firewall.service";

jest.mock("child_process");

describe("IptablesFirewallService", () => {
  let service: IptablesFirewallService;
  let eventEmitter: EventEmitter2;
  let execSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    execSpy = jest.spyOn(ChildProcess, "exec");
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        IptablesFirewallService,
      ],
    }).compile();

    service = module.get<IptablesFirewallService>(IptablesFirewallService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should init the firewall", async () => {
    jest.useFakeTimers();

    await service.onModuleInit();
    jest.advanceTimersByTime(1000); // Fast-forward timer

    expect(execSpy).toHaveBeenCalledTimes(3);
    expect(execSpy).toHaveBeenNthCalledWith(
      1,
      "iptables -N banalize",
      expect.any(Function),
    );
    expect(execSpy).toHaveBeenNthCalledWith(
      2,
      "iptables -I INPUT -j banalize",
      expect.any(Function),
    );
    expect(execSpy).toHaveBeenNthCalledWith(
      3,
      "iptables -F banalize",
      expect.any(Function),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(Events.FIREWALL_READY);

    jest.useRealTimers();
  });

  it("should destroy the firewall", async () => {
    await service.onModuleDestroy();

    expect(execSpy).toHaveBeenCalledTimes(3);
    expect(execSpy).toHaveBeenNthCalledWith(
      1,
      "iptables -F banalize",
      expect.any(Function),
    );
    expect(execSpy).toHaveBeenNthCalledWith(
      2,
      "iptables -D INPUT -j banalize",
      expect.any(Function),
    );
    expect(execSpy).toHaveBeenNthCalledWith(
      3,
      "iptables -X banalize",
      expect.any(Function),
    );
  });

  describe("denyIp", () => {
    it("should deny an IP", async () => {
      const ip = "192.168.1.1";

      await service.denyIp(ip);

      expect(execSpy).toHaveBeenCalledTimes(1);
      expect(execSpy).toHaveBeenCalledWith(
        `iptables -A banalize -s ${ip}/32 -j REJECT --reject-with icmp-port-unreachable`,
        expect.any(Function),
      );
    });

    it("should not deny an IP if it is already banned", async () => {
      const ip = "192.168.1.1";
      await service.denyIp(ip);
      jest.clearAllMocks();

      await service.denyIp(ip);

      expect(execSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe("allowIp", () => {
    it("should allow an IP", async () => {
      const ip = "192.168.1.1";
      await service.denyIp(ip);
      jest.clearAllMocks();

      await service.allowIp(ip);

      expect(execSpy).toHaveBeenCalledTimes(1);
      expect(execSpy).toHaveBeenCalledWith(
        `iptables -D banalize -s ${ip}/32 -j REJECT --reject-with icmp-port-unreachable`,
        expect.any(Function),
      );
    });

    it("should not allow an IP if it is not banned", async () => {
      const ip = "192.168.1.1";

      await service.allowIp(ip);

      expect(execSpy).toHaveBeenCalledTimes(0);
    });
  });
});
