import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HighlightedCode } from "@/components/react/ai-email/HighlightedCode";

describe("HighlightedCode", () => {
  it("renders xml-like tags, attributes, strings, comments, and text", () => {
    render(
      <pre>
        <code>
          <HighlightedCode code={'<!-- hi -->\n<mj-text color="#fff">Hello</mj-text>'} />
        </code>
      </pre>,
    );

    expect(screen.getByText("<!-- hi -->")).toHaveClass("text-slate-500");
    expect(screen.getByText("<mj-text")).toHaveClass("text-sky-300");
    expect(screen.getByText("color")).toHaveClass("text-amber-200");
    expect(screen.getByText('"#fff"')).toHaveClass("text-emerald-300");
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("handles malformed tags and trailing plain text", () => {
    render(
      <pre>
        <code>
          <HighlightedCode code={'<>Lead <mj-text !!! color="#fff">Trailing'} />
        </code>
      </pre>,
    );

    expect(screen.getByText(/<>Lead/)).toHaveClass("text-slate-100");
    expect(screen.getByText(/!!!/)).toHaveClass("text-sky-300");
    expect(screen.getByText("Trailing")).toHaveClass("text-slate-100");
  });

  it("treats unknown bracketed syntax as a tag token", () => {
    render(
      <pre>
        <code>
          <HighlightedCode code={"<$>"} />
        </code>
      </pre>,
    );

    expect(screen.getByText("<$>")).toHaveClass("text-sky-300");
  });
});

