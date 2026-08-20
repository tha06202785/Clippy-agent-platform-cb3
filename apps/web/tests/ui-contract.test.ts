import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Button, ErrorState, Input } from "@clippy/ui";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return entry.name.endsWith(".tsx") ? [target] : [];
  });
}

describe("shared UI contracts", () => {
  it("defaults buttons to a safe non-submit type", () => {
    const html = renderToStaticMarkup(createElement(Button, null, "Save"));
    expect(html).toContain('type="button"');
  });

  it("announces loading buttons and prevents duplicate activation", () => {
    const html = renderToStaticMarkup(
      createElement(
        Button,
        { isLoading: true, loadingText: "Saving…" },
        "Save",
      ),
    );
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("disabled");
    expect(html).toContain("Saving…");
  });

  it("exposes invalid form controls and alert states to assistive tech", () => {
    const input = renderToStaticMarkup(
      createElement(Input, { "aria-invalid": true }),
    );
    const error = renderToStaticMarkup(
      createElement(ErrorState, {
        title: "Could not load",
        description: "Try again",
      }),
    );
    expect(input).toContain('aria-invalid="true"');
    expect(error).toContain('role="alert"');
  });
});

describe("frontend source guardrails", () => {
  const files = sourceFiles(path.resolve(process.cwd(), "src"));

  it("gives every native button an explicit type", () => {
    const violations = files.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return Array.from(source.matchAll(/<button\b([^>]*)>/g))
        .filter((match) => !/\btype\s*=/.test(match[1]))
        .map(() => path.relative(process.cwd(), file));
    });
    expect(violations).toEqual([]);
  });

  it("does not use raw image elements", () => {
    const violations = files
      .filter((file) => /<img\b/.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(process.cwd(), file));
    expect(violations).toEqual([]);
  });

  it("does not attach click handlers to non-interactive containers", () => {
    const violations = files.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return Array.from(
        source.matchAll(/<(div|article|span)\b[^>]*\bonClick\s*=/g),
      ).map(() => path.relative(process.cwd(), file));
    });
    expect(violations).toEqual([]);
  });

  it("gives every table header an explicit scope", () => {
    const violations = files.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return Array.from(source.matchAll(/<th\b([^>]*)>/g))
        .filter((match) => !/\bscope\s*=/.test(match[1]))
        .map(() => path.relative(process.cwd(), file));
    });
    expect(violations).toEqual([]);
  });

  it("associates labels with their form controls", () => {
    const violations = files.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return Array.from(source.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/g))
        .filter(
          (match) =>
            !/\bhtmlFor\s*=/.test(match[1]) &&
            !/<(?:input|select|textarea|Input|Select|Textarea)\b/.test(
              match[2],
            ),
        )
        .map(() => path.relative(process.cwd(), file));
    });
    expect(violations).toEqual([]);
  });

  it("keeps one main landmark inside authenticated routes", () => {
    const dashboardRoot = path.resolve(process.cwd(), "src/app/(dashboard)");
    const violations = sourceFiles(dashboardRoot)
      .filter((file) => /<main\b/.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(process.cwd(), file));
    expect(violations).toEqual([]);
  });
});
