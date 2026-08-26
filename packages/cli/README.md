# huellup

A companion CLI (and MCP server) for [Huell](https://github.com/Arshdeep54/huell) — a self-hostable docs platform. Use it to author and validate a `docs/` folder (`docs.json` + `.mdx`) outside the dashboard, and to let AI coding agents write docs against the schema correctly.

This is entirely optional. Nothing about connecting a repo or uploading a `docs.zip` to Huell requires it — it just makes authoring docs locally faster.

## Commands

```bash
npx huellup init [dir]       # scaffold a new docs/ folder
npx huellup validate [dir]   # check it for errors before pushing
npx huellup preview [dir]    # hot-reloading local preview
npx huellup mcp              # start the MCP server (for an agent's config, not run directly)
```

`preview` bundles its own copy of the docs-site template and runs entirely standalone — no monorepo clone needed.

## Using the MCP server with an agent

Add this to your agent's MCP server config (Claude Code, Claude Desktop, Cursor, or anything else that speaks MCP):

```json
{
  "mcpServers": {
    "huellup": {
      "command": "npx",
      "args": ["-y", "huellup", "mcp"]
    }
  }
}
```

The server exposes a `docs-json-schema` resource, a `components` resource (the MDX components available with no import), and a `validate_docs` tool.

## Docs

Full documentation: [Huell's CLI and MCP guide](https://github.com/Arshdeep54/huell/blob/main/docs/guides/cli-and-mcp.mdx).
