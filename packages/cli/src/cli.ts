#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "./commands/init";
import { runValidate } from "./commands/validate";
import { runPreview } from "./commands/preview";
import { runMcp } from "./commands/mcp";

const program = new Command();

program
  .name("huell-docs")
  .description("Author, validate, and preview Huell-format docs (docs.json + .mdx)")
  .version("0.1.0");

program
  .command("init")
  .description("Scaffold a new docs/ folder with an example docs.json + pages")
  .argument("[dir]", "directory to create the docs folder in", "docs")
  .action(runInit);

program
  .command("validate")
  .description("Check a docs/ folder for errors before publishing")
  .argument("[dir]", "docs folder to validate", "docs")
  .action(runValidate);

program
  .command("preview")
  .description("Run a hot-reloading local preview of a docs/ folder")
  .argument("[dir]", "docs folder to preview", "docs")
  .action(runPreview);

program
  .command("mcp")
  .description("Start the MCP server (stdio) — wire this into an AI coding agent so it can write valid docs")
  .action(runMcp);

program.parse();
