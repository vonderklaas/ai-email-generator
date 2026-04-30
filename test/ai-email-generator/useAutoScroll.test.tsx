import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { useAutoScroll } from "@/hooks/useAutoScroll";

function Harness({ dep }: { dep: number }) {
  const ref = useAutoScroll(dep);
  return <div ref={ref} />;
}

describe("useAutoScroll", () => {
  it("uses scrollTo when available", () => {
    const scrollTo = vi.fn();
    const { rerender, container } = render(<Harness dep={0} />);

    const el = container.querySelector("div") as HTMLDivElement;
    (el as unknown as { scrollTo?: (options: unknown) => void }).scrollTo = scrollTo;

    rerender(<Harness dep={1} />);
    expect(scrollTo).toHaveBeenCalled();
  });
});

