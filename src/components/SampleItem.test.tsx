import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { SampleItem } from "./SampleItem";

describe("SampleItem", () => {
  const defaultProps = {
    index: 1,
    name: "kick-drum.wav",
    duration: 2.5,
    isLoading: false,
    onRemove: vi.fn(),
  };

  it("renders the sample name", () => {
    render(<SampleItem {...defaultProps} />);
    expect(screen.getByText("kick-drum.wav")).toBeInTheDocument();
  });

  it("renders the zero-padded index", () => {
    render(<SampleItem {...defaultProps} index={7} />);
    expect(screen.getByText("007")).toBeInTheDocument();
  });

  it("renders a 3-digit padded index for numbers >= 100", () => {
    render(<SampleItem {...defaultProps} index={100} />);
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("renders the formatted duration when not loading", () => {
    render(<SampleItem {...defaultProps} duration={65.3} />);
    expect(screen.getByText("1:05.3")).toBeInTheDocument();
  });

  it("hides the duration and shows [LOADING] text when loading", () => {
    render(<SampleItem {...defaultProps} isLoading={true} />);
    expect(screen.queryByText("0:02.5")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
    expect(screen.getByText("[LOADING]")).toBeInTheDocument();
  });

  it("calls onRemove when the remove button is clicked", async () => {
    const onRemove = vi.fn();
    render(<SampleItem {...defaultProps} onRemove={onRemove} />);
    await userEvent.click(
      screen.getByRole("button", { name: /remove kick-drum\.wav/i }),
    );
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("remove button is accessible while loading", async () => {
    const onRemove = vi.fn();
    render(
      <SampleItem {...defaultProps} isLoading={true} onRemove={onRemove} />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /remove kick-drum\.wav/i }),
    );
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("shows the full name as a tooltip via title attribute", () => {
    render(
      <SampleItem {...defaultProps} name="very-long-sample-name.wav" />,
    );
    expect(
      screen.getByTitle("very-long-sample-name.wav"),
    ).toBeInTheDocument();
  });

  it("renders the terminal prompt character", () => {
    render(<SampleItem {...defaultProps} />);
    expect(screen.getByText(">")).toBeInTheDocument();
  });
});
