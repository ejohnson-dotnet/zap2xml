import { describe, it, expect } from "vitest";
import { processLineupId, getHeadendId, getCliOptions } from "./config.js";

function withArgvAndEnv(args: string[], env: Record<string, string>, run: () => void) {
  const originalArgv = [...process.argv];
  const originalEnv = { ...process.env };
  try {
    process.argv = [...originalArgv.filter((arg) => !arg.startsWith("--")), ...args];
    for (const [key, value] of Object.entries(env)) {
      process.env[key] = value;
    }
    run();
  } finally {
    process.argv = originalArgv;
    process.env = originalEnv;
  }
}

describe("processLineupId", () => {
  it("returns env LINEUP_ID if set", () => {
    process.env.LINEUP_ID = "USA-12345";
    expect(processLineupId()).toBe("USA-12345");
    delete process.env.LINEUP_ID;
  });

  it("returns argv --lineupId if set", () => {
    process.argv.push("--lineupId=USA-54321");
    expect(processLineupId()).toBe("USA-54321");
    process.argv = process.argv.filter((arg) => !arg.startsWith("--lineupId="));
  });

  it("returns default if nothing set", () => {
    expect(processLineupId()).toBe("USA-lineupId-DEFAULT");
  });

  it("returns default if lineupId contains OTA", () => {
    process.env.LINEUP_ID = "USA-OTA12345";
    expect(processLineupId()).toBe("USA-lineupId-DEFAULT");
    delete process.env.LINEUP_ID;
  });
});

describe("getHeadendId", () => {
  it("extracts headend from valid lineupId", () => {
    expect(getHeadendId("USA-OTA12345")).toBe("lineupId");
    expect(getHeadendId("USA-NY31587-L")).toBe("NY31587");
    expect(getHeadendId("CAN-OTAT1L0A1")).toBe("lineupId");
    expect(getHeadendId("CAN-0008861-X")).toBe("0008861");
  });

  it("returns 'lineup' if no match", () => {
    expect(getHeadendId("INVALID")).toBe("lineup");
    expect(getHeadendId("")).toBe("lineup");
  });
});

describe("getCliOptions precedence", () => {
  it("prefers CLI over env for string options", () => {
    withArgvAndEnv(
      ["--lineupId=USA-CLI123", "--timespan=12", "--postalCode=55417"],
      {
        LINEUP_ID: "USA-ENV999",
        TIMESPAN: "360",
        POSTAL_CODE: "99999",
      },
      () => {
        const options = getCliOptions();
        expect(options.lineupId).toBe("USA-CLI123");
        expect(options.timespan).toBe("12");
        expect(options.postalCode).toBe("55417");
      },
    );
  });

  it("uses env when CLI string options are not provided", () => {
    withArgvAndEnv(
      [],
      {
        LINEUP_ID: "USA-ENV111",
        TIMESPAN: "240",
        POSTAL_CODE: "12345",
      },
      () => {
        const options = getCliOptions();
        expect(options.lineupId).toBe("USA-ENV111");
        expect(options.timespan).toBe("240");
        expect(options.postalCode).toBe("12345");
      },
    );
  });

  it("prefers CLI true flag over env false for boolean options", () => {
    withArgvAndEnv(
      ["--appendAsterisk", "--mediaportal"],
      {
        APPEND_ASTERISK: "false",
        MEDIA_PORTAL: "false",
      },
      () => {
        const options = getCliOptions();
        expect(options.appendAsterisk).toBe(true);
        expect(options.mediaportal).toBe(true);
      },
    );
  });
});
