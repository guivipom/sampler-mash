import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { MashControls } from "./MashControls";

describe("MashControls", () => {
  it("renders the generate button", () => {
    render(
      <MashControls hasReadySamples={true} isRendering={false} onGenerate={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /generate mash/i })).toBeInTheDocument();
  });

  it("button is disabled when there are no ready samples", () => {
    render(
      <MashControls hasReadySamples={false} isRendering={false} onGenerate={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /generate mash/i })).toBeDisabled();
  });

  it("button is disabled while rendering", () => {
    render(
      <MashControls hasReadySamples={true} isRendering={true} onGenerate={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /generate mash/i })).toBeDisabled();
  });

  it("shows the rendering indicator while rendering", () => {
    render(
      <MashControls hasReadySamples={true} isRendering={true} onGenerate={vi.fn()} />,
    );
    expect(screen.getByText(/rendering\.\.\./i)).toBeInTheDocument();
  });

  it("does not show the rendering indicator when not rendering", () => {
    render(
      <MashControls hasReadySamples={true} isRendering={false} onGenerate={vi.fn()} />,
    );
    expect(screen.queryByText(/rendering\.\.\./i)).not.toBeInTheDocument();
  });

  it("calls onGenerate when the button is clicked", async () => {
    const onGenerate = vi.fn();
    render(
      <MashControls hasReadySamples={true} isRendering={false} onGenerate={onGenerate} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /generate mash/i }));
    expect(onGenerate).toHaveBeenCalledOnce();
  });

  it("button is enabled when samples are ready and not rendering", () => {
    render(
      <MashControls hasReadySamples={true} isRendering={false} onGenerate={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /generate mash/i })).not.toBeDisabled();
  });
});
