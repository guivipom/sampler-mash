import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { SampleList } from "./SampleList";

const makeSample = (overrides: Partial<Parameters<typeof SampleList>[0]["samples"][0]> = {}) => ({
  id: "sample-1",
  name: "kick.wav",
  duration: 1.0,
  isLoading: false,
  ...overrides,
});

describe("SampleList", () => {
  it("shows the empty state message when there are no samples", () => {
    render(<SampleList samples={[]} onRemove={vi.fn()} />);
    expect(screen.getByText(/no samples uploaded yet/i)).toBeInTheDocument();
  });

  it("renders one list item per sample", () => {
    const samples = [
      makeSample({ id: "1", name: "kick.wav" }),
      makeSample({ id: "2", name: "snare.wav" }),
      makeSample({ id: "3", name: "hihat.wav" }),
    ];
    render(<SampleList samples={samples} onRemove={vi.fn()} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("kick.wav")).toBeInTheDocument();
    expect(screen.getByText("snare.wav")).toBeInTheDocument();
    expect(screen.getByText("hihat.wav")).toBeInTheDocument();
  });

  it("does not show the empty state when samples are present", () => {
    render(
      <SampleList samples={[makeSample()]} onRemove={vi.fn()} />,
    );
    expect(screen.queryByText(/no samples uploaded yet/i)).not.toBeInTheDocument();
  });

  it("calls onRemove with the correct sample id", async () => {
    const onRemove = vi.fn();
    const samples = [
      makeSample({ id: "abc", name: "bass.wav" }),
      makeSample({ id: "xyz", name: "lead.wav" }),
    ];
    render(<SampleList samples={samples} onRemove={onRemove} />);

    const items = screen.getAllByRole("listitem");
    const bassItem = items.find((item) => within(item).queryByText("bass.wav"));
    await userEvent.click(
      within(bassItem!).getByRole("button", { name: /remove bass\.wav/i }),
    );

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith("abc");
  });

  it("passes the loading state down to the correct sample item", () => {
    const samples = [
      makeSample({ id: "1", name: "loading.wav", isLoading: true }),
      makeSample({ id: "2", name: "ready.wav", isLoading: false }),
    ];
    render(<SampleList samples={samples} onRemove={vi.fn()} />);
    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
    expect(screen.getByText("0:01.0")).toBeInTheDocument();
  });
});
