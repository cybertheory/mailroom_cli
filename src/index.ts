#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import open from "open";
import { loadConfig, saveConfig, requireAuth } from "./config.js";
import { MailroomAPI } from "./api.js";

const program = new Command();

program
  .name("mailroom")
  .description("CLI for the Mailroom agent address registry — mailroom.network")
  .version("0.1.0");

// ---------------------------------------------------------------------------
// register
// ---------------------------------------------------------------------------
program
  .command("register <address>")
  .description("Register an agent email address (sends a verification code)")
  .option("-n, --name <name>", "Agent display name")
  .action(async (address: string, opts: { name?: string }) => {
    const config = loadConfig();
    const api = new MailroomAPI(config);

    console.log(chalk.dim(`Registering ${address}...`));
    const result = await api.register(address, opts.name);

    if (result.error) {
      console.error(chalk.red(`Error: ${result.error}`));
      process.exit(1);
    }

    config.address = address.trim().toLowerCase();
    saveConfig(config);

    console.log(chalk.green("✓ ") + result.message);
    console.log(chalk.dim("\nCheck your inbox and run:"));
    console.log(chalk.bold(`  mailroom verify <code>`));
  });

// ---------------------------------------------------------------------------
// verify
// ---------------------------------------------------------------------------
program
  .command("verify <code>")
  .description("Verify your address with the code from the email")
  .action(async (code: string) => {
    const config = loadConfig();
    if (!config.address) {
      console.error(chalk.red("No address set. Run `mailroom register <address>` first."));
      process.exit(1);
    }

    const api = new MailroomAPI(config);
    console.log(chalk.dim(`Verifying ${config.address}...`));
    const result = await api.verify(config.address, code);

    if (result.error) {
      console.error(chalk.red(`Error: ${result.error}`));
      process.exit(1);
    }

    config.token = result.token;
    saveConfig(config);

    console.log(chalk.green("✓ ") + "Verified! Auth token saved.");
    console.log(chalk.dim("\nYou can now manage your agent:"));
    console.log(chalk.bold("  mailroom online"));
    console.log(chalk.bold('  mailroom set name "My Agent"'));
    console.log(chalk.bold("  mailroom status"));
  });

// ---------------------------------------------------------------------------
// auth (re-authenticate)
// ---------------------------------------------------------------------------
program
  .command("auth")
  .description("Re-authenticate — sends a new verification code to your address")
  .option("-a, --address <address>", "Override the stored address")
  .action(async (opts: { address?: string }) => {
    const config = loadConfig();
    const address = opts.address ?? config.address;

    if (!address) {
      console.error(chalk.red("No address. Run `mailroom register <address>` or pass --address."));
      process.exit(1);
    }

    const api = new MailroomAPI(config);
    console.log(chalk.dim(`Sending verification code to ${address}...`));
    const result = await api.reauth(address);

    if (result.error) {
      console.error(chalk.red(`Error: ${result.error}`));
      process.exit(1);
    }

    config.address = address.trim().toLowerCase();
    saveConfig(config);

    console.log(chalk.green("✓ ") + result.message);
    console.log(chalk.dim("\nRun:"));
    console.log(chalk.bold("  mailroom verify <code>"));
  });

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------
program
  .command("status")
  .description("Show your agent's current registry status")
  .action(async () => {
    const config = loadConfig();
    requireAuth(config);
    const api = new MailroomAPI(config);

    try {
      const agent = await api.getAgent(config.address);
      console.log();
      console.log(chalk.bold("  Mailroom Agent"));
      console.log(chalk.dim("  ─────────────────────────────"));
      console.log(`  Address:     ${chalk.cyan(agent.address)}`);
      console.log(`  Name:        ${agent.name || chalk.dim("(not set)")}`);
      console.log(`  Description: ${agent.description || chalk.dim("(not set)")}`);
      console.log(`  Online:      ${agent.isOnline ? chalk.green("● online") : chalk.dim("○ offline")}`);
      console.log(`  Public:      ${agent.showPublic ? chalk.green("yes") : chalk.yellow("hidden")}`);
      console.log(`  Owner (X):   ${agent.ownerX || chalk.dim("(not linked)")}`);
      console.log(`  Picture:     ${agent.profilePicture || chalk.dim("(not set)")}`);
      console.log(`  Registered:  ${agent.createdAt}`);
      console.log();
    } catch (e: any) {
      console.error(chalk.red(`Error: ${e.message}`));
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// online / offline
// ---------------------------------------------------------------------------
program
  .command("online")
  .description("Set your agent status to online")
  .action(async () => {
    const config = loadConfig();
    requireAuth(config);
    const api = new MailroomAPI(config);

    await api.updateAgent(config.address, { is_online: true });
    console.log(chalk.green("● ") + "Status set to online");
  });

program
  .command("offline")
  .description("Set your agent status to offline")
  .action(async () => {
    const config = loadConfig();
    requireAuth(config);
    const api = new MailroomAPI(config);

    await api.updateAgent(config.address, { is_online: false });
    console.log(chalk.dim("○ ") + "Status set to offline");
  });

// ---------------------------------------------------------------------------
// set <field> <value>
// ---------------------------------------------------------------------------
program
  .command("set <field> <value>")
  .description("Update a profile field (name, description, picture, public, owner_x)")
  .action(async (field: string, value: string) => {
    const config = loadConfig();
    requireAuth(config);
    const api = new MailroomAPI(config);

    const fieldMap: Record<string, string> = {
      name: "name",
      description: "description",
      desc: "description",
      picture: "profile_picture",
      pic: "profile_picture",
      profile_picture: "profile_picture",
      public: "show_public",
      owner_x: "owner_x",
      x: "owner_x",
    };

    const apiField = fieldMap[field.toLowerCase()];
    if (!apiField) {
      console.error(chalk.red(`Unknown field: ${field}`));
      console.error(chalk.dim(`Valid fields: ${Object.keys(fieldMap).join(", ")}`));
      process.exit(1);
    }

    let parsedValue: unknown = value;
    if (apiField === "show_public" || apiField === "is_online") {
      parsedValue = ["true", "1", "yes", "on"].includes(value.toLowerCase());
    }

    try {
      const updated = await api.updateAgent(config.address, { [apiField]: parsedValue });
      console.log(chalk.green("✓ ") + `Updated ${field} → ${value}`);
    } catch (e: any) {
      console.error(chalk.red(`Error: ${e.message}`));
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// link
// ---------------------------------------------------------------------------
program
  .command("link")
  .description("Open the dashboard to link your X (Twitter) account as owner")
  .action(async () => {
    const config = loadConfig();
    requireAuth(config);

    const dashboardUrl = `https://mailroom.network/link?address=${encodeURIComponent(config.address)}`;
    console.log(chalk.dim("Opening dashboard to link your X account..."));
    console.log(chalk.cyan(dashboardUrl));
    await open(dashboardUrl);
  });

// ---------------------------------------------------------------------------
// search
// ---------------------------------------------------------------------------
program
  .command("search [query]")
  .description("Search the public agent directory")
  .action(async (query?: string) => {
    const config = loadConfig();
    const api = new MailroomAPI(config);

    const result = await api.listAgents(query);
    const agents = result.agents ?? [];

    if (agents.length === 0) {
      console.log(chalk.dim("No agents found."));
      return;
    }

    console.log(chalk.bold(`\n  Mailroom Directory (${result.total} agents)\n`));
    for (const a of agents) {
      const status = a.isOnline ? chalk.green("●") : chalk.dim("○");
      const owner = a.ownerX ? chalk.cyan(` @${a.ownerX}`) : "";
      console.log(`  ${status} ${chalk.bold(a.name || a.address)} ${chalk.dim(`<${a.address}>`)}${owner}`);
      if (a.description) {
        console.log(`    ${chalk.dim(a.description)}`);
      }
    }
    console.log();
  });

// ---------------------------------------------------------------------------
// whoami
// ---------------------------------------------------------------------------
program
  .command("whoami")
  .description("Show the currently configured address and auth status")
  .action(() => {
    const config = loadConfig();
    console.log();
    console.log(`  Address:  ${config.address ? chalk.cyan(config.address) : chalk.dim("(not set)")}`);
    console.log(`  Auth:     ${config.token ? chalk.green("authenticated") : chalk.red("not authenticated")}`);
    console.log(`  API:      ${chalk.dim(config.apiUrl)}`);
    console.log();
  });

// ---------------------------------------------------------------------------
// unregister
// ---------------------------------------------------------------------------
program
  .command("unregister")
  .description("Remove your agent from the registry (irreversible)")
  .action(async () => {
    const config = loadConfig();
    requireAuth(config);
    const api = new MailroomAPI(config);

    console.log(chalk.yellow(`Removing ${config.address} from Mailroom...`));
    const result = await api.deleteAgent(config.address);

    if (result.error) {
      console.error(chalk.red(`Error: ${result.error}`));
      process.exit(1);
    }

    saveConfig({ apiUrl: config.apiUrl });

    console.log(chalk.green("✓ ") + "Agent removed from registry.");
  });

program.parse();
