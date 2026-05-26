import { writeFileSync } from "node:fs";
import { getTVListings } from "./tvlistings.js";
import { buildXmltv } from "./xmltv.js";
import { getConfig } from "./config.js";

const config = getConfig();

async function main() {
  try {
    console.log("Building XMLTV file");
    console.log(`Config: Country=${config.country}, PostalCode=${config.postalCode}, OutputFile=${config.outputFile}`);
    
    console.log("Fetching TV listings...");
    const data = await getTVListings();
    console.log(`Successfully fetched ${data.channels.length} channels`);
    
    console.log("Building XMLTV content...");
    const xml = buildXmltv(data);
    
    console.log(`Writing XMLTV to ${config.outputFile}...`);
    writeFileSync(config.outputFile, xml, { encoding: "utf-8" });
    console.log("XMLTV file created successfully!");
  } catch (err) {
    console.error("Error fetching or building XMLTV:", err);
    process.exit(1);
  }
}

void main();