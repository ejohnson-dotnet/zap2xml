import { Command } from "commander";
import { UserAgent } from "./useragents.js";

const validCountries = [
  "ABW", "AIA", "ARG", "ATG", "BHS", "BLZ", "BRA", "BRB", "BMU", "CAN", "COL", "CRI",
  "CUW", "CYM", "DMA", "DOM", "ECU", "GRD", "GTM", "GUY", "HND", "JAM", "KNA", "LCA",
  "MAF", "MEX", "PAN", "PER", "TCA", "TTO", "URY", "USA", "VCT", "VEN", "VGB"
];

export interface CliOptions {
  appendAsterisk: boolean;
  mediaportal: boolean;
  lineupId?: string;
  timespan: string;
  pref: string;
  country: string;
  postalCode: string;
  userAgent: string;
  timezone: string;
  outputFile: string;
  nextpvr: boolean;
  stationid: boolean;
  sortname: boolean;
}

function envFlag(name: string): boolean {
  return (process.env[name] || "").toLowerCase() === "true";
}

export function getCliOptions(argv: string[] = process.argv): CliOptions {
  const cli = new Command()
    .allowUnknownOption(true)
    .option("--appendAsterisk", "Append * to titles with <new /> or <live />")
    .option("--mediaportal", "Prioritize xmltv_ns episode-num tags")
    .option("--lineupId <lineupId>", "Lineup ID")
    .option("--timespan <hours>", "Timespan in hours (up to 360)", "6")
    .option("--pref <prefs>", "User Preferences, e.g. m,p,h", "")
    .option("--country <code>", "Country code", "USA")
    .option("--postalCode <zip>", "Postal code", "30309")
    .option("--userAgent <agent>", "Custom user agent string")
    .option("--timezone <zone>", "Timezone", "America/New_York")
    .option("--outputFile <filename>", "Output file name", "xmltv.xml")
    .option("--nextpvr", "Move \"channelNo callsign\" display-name to first position")
    .option("--stationid", "Sort channels by station ID (legacy behavior)")
    .option("--sortname", "Sort channels alphabetically by call sign/name");

  cli.parse(argv);
  const parsed = cli.opts() as { [key: string]: string | boolean | undefined };

  const getString = (name: string, envName: string, fallback: string): string => {
    const source = cli.getOptionValueSource(name);
    if (source === "cli") {
      return (parsed[name] as string) || fallback;
    }
    return (process.env[envName] || (parsed[name] as string) || fallback) as string;
  };

  const lineupSource = cli.getOptionValueSource("lineupId");
  const lineupId =
    lineupSource === "cli"
      ? (parsed["lineupId"] as string | undefined)
      : (process.env["LINEUP_ID"] || parsed["lineupId"] || undefined) as string | undefined;

  return {
    appendAsterisk: parsed["appendAsterisk"] === true || envFlag("APPEND_ASTERISK"),
    mediaportal: parsed["mediaportal"] === true || envFlag("MEDIA_PORTAL"),
    lineupId,
    timespan: getString("timespan", "TIMESPAN", "6"),
    pref: getString("pref", "PREF", ""),
    country: getString("country", "COUNTRY", "USA"),
    postalCode: getString("postalCode", "POSTAL_CODE", "30309"),
    userAgent: getString("userAgent", "USER_AGENT", UserAgent || "Mozilla/5.0"),
    timezone: getString("timezone", "TZ", "America/New_York"),
    outputFile: getString("outputFile", "OUTPUT_FILE", "xmltv.xml"),
    nextpvr: parsed["nextpvr"] === true || envFlag("NEXTPVR"),
    stationid: parsed["stationid"] === true || envFlag("STATIONID"),
    sortname: parsed["sortname"] === true || envFlag("SORTNAME"),
  };
}

export function processLineupId(): string {
  const cli = getCliOptions();
  const country = cli.country;
  const lineupId = cli.lineupId || `${country}-lineupId-DEFAULT`;

  if (!validCountries.includes(country)) {
    throw new Error(`Invalid country code: ${country}`);
  }

  if (lineupId.includes("OTA")) {
    return `${country}-lineupId-DEFAULT`;
  }

  return lineupId;
}

export function getHeadendId(lineupId: string): string {
  if (lineupId.includes("OTA")) {
    return "lineupId";
  }

  const match = lineupId.match(/^(?:[A-Z]{3})-(.*?)(?:-[A-Z]+)?$/);

  return match?.[1] || "lineup";
}

export function getConfig() {
  const cli = getCliOptions();
  const lineupId = processLineupId();
  const headendId = getHeadendId(lineupId);
  const country = cli.country;

  if (!validCountries.includes(country)) {
    throw new Error(`Invalid country code: ${country}`);
  }

  return {
    baseUrl: "https://tvlistings.gracenote.com/api/grid",
    lineupId,
    headendId,
    timespan: cli.timespan,
    country,
    postalCode: cli.postalCode,
    pref: cli.pref,
    timezone: cli.timezone,
    userAgent: cli.userAgent,
    outputFile: cli.outputFile,
  };
}
