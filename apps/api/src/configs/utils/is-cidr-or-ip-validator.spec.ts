import { validate } from "class-validator";
import { IsCidrOrIp } from "./is-cidr-or-ip-validator";

class TestClass {
  @IsCidrOrIp()
  ipList: string[];
}

describe("IsCidrOrIp", () => {
  let test: TestClass;

  beforeEach(() => {
    test = new TestClass();
  });

  it("should validate valid IP addresses", async () => {
    test.ipList = ["192.168.1.1", "10.0.0.1", "172.16.0.1"];
    const errors = await validate(test);
    expect(errors).toHaveLength(0);
  });

  it("should validate valid CIDR notations", async () => {
    test.ipList = ["192.168.1.0/24", "10.0.0.0/8", "172.16.0.0/16"];
    const errors = await validate(test);
    expect(errors).toHaveLength(0);
  });

  it("should validate mix of IPs and CIDR notations", async () => {
    test.ipList = ["192.168.1.1", "10.0.0.0/8", "172.16.0.1"];
    const errors = await validate(test);
    expect(errors).toHaveLength(0);
  });

  it("should reject invalid IP addresses", async () => {
    const invalidIPs = [
      ["256.1.2.3"],
      ["1.2.3.256"],
      ["1.2.3"],
      ["1.2.3.4.5"],
      ["abc.def.ghi.jkl"],
      ["192.168.1."],
      [".192.168.1"],
    ];

    for (const ips of invalidIPs) {
      test.ipList = ips;
      const errors = await validate(test);
      expect(errors).toHaveLength(1);
    }
  });

  it("should reject invalid CIDR notations", async () => {
    const invalidCIDRs = [
      ["192.168.1.0/33"],
      ["192.168.1.0/-1"],
      ["192.168.1.0/"],
      ["192.168.1/24"],
      ["192.168.1.0.0/24"],
      ["256.168.1.0/24"],
    ];

    for (const cidrs of invalidCIDRs) {
      test.ipList = cidrs;
      const errors = await validate(test);
      expect(errors).toHaveLength(1);
    }
  });

  it("should reject if not an array", async () => {
    // @ts-expect-error - intentionally passing a string
    test.ipList = "192.168.1.1";
    const errors = await validate(test);
    expect(errors).toHaveLength(1);
  });

  it("should handle mixed valid and invalid entries", async () => {
    test.ipList = ["192.168.1.1", "256.256.256.256", "10.0.0.0/8"];
    const errors = await validate(test);
    expect(errors).toHaveLength(1);
  });

  it("should validate all border cases for valid IPs", async () => {
    test.ipList = ["0.0.0.0", "255.255.255.255", "192.168.0.1", "1.2.3.4"];
    const errors = await validate(test);
    expect(errors).toHaveLength(0);
  });

  it("should validate all border cases for valid CIDRs", async () => {
    test.ipList = [
      "0.0.0.0/0",
      "192.168.1.0/32",
      "10.0.0.0/8",
      "172.16.0.0/16",
      "192.168.1.0/24",
    ];
    const errors = await validate(test);
    expect(errors).toHaveLength(0);
  });
});
