import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { UploadButton } from "./UploadButton";

function makeAudioFile(name: string, type: string = "audio/wav"): File {
  return new File(["audio"], name, { type });
}

describe("UploadButton", () => {
  const defaultProps = {
    currentCount: 0,
    maxCount: 25,
    onFilesSelected: vi.fn(),
    onRejected: vi.fn(),
  };

  it("renders with the correct count label", () => {
    render(<UploadButton {...defaultProps} currentCount={3} />);
    expect(
      screen.getByRole("button", { name: /add samples, 3 of 25 used/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Add Samples (3/25)")).toBeInTheDocument();
  });

  it("renders 0/25 when no samples are uploaded", () => {
    render(<UploadButton {...defaultProps} currentCount={0} />);
    expect(screen.getByText("Add Samples (0/25)")).toBeInTheDocument();
  });

  it("is disabled and shows limit message when at capacity", () => {
    render(<UploadButton {...defaultProps} currentCount={25} />);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(screen.getByText("Sample limit reached (25/25)")).toBeInTheDocument();
  });

  it("is enabled when one slot remains", () => {
    render(<UploadButton {...defaultProps} currentCount={24} />);
    expect(screen.getByRole("button")).not.toBeDisabled();
    expect(screen.getByText("Add Samples (24/25)")).toBeInTheDocument();
  });

  it("calls onFilesSelected with valid audio files", async () => {
    const onFilesSelected = vi.fn();
    render(
      <UploadButton
        {...defaultProps}
        currentCount={0}
        onFilesSelected={onFilesSelected}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [
      makeAudioFile("kick.wav", "audio/wav"),
      makeAudioFile("snare.mp3", "audio/mpeg"),
    ];
    await userEvent.upload(input, files);

    expect(onFilesSelected).toHaveBeenCalledTimes(1);
    expect(onFilesSelected).toHaveBeenCalledWith(files);
  });

  it("filters out non-audio files and calls onFilesSelected with only audio files", async () => {
    const onFilesSelected = vi.fn();
    render(
      <UploadButton
        {...defaultProps}
        currentCount={0}
        onFilesSelected={onFilesSelected}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const audioFile = makeAudioFile("kick.wav", "audio/wav");
    const imageFile = new File(["img"], "photo.jpg", { type: "image/jpeg" });
    await userEvent.upload(input, [audioFile, imageFile]);

    expect(onFilesSelected).toHaveBeenCalledWith([audioFile]);
  });

  it("calls onRejected when selection would exceed the cap", async () => {
    const onRejected = vi.fn();
    const onFilesSelected = vi.fn();
    render(
      <UploadButton
        {...defaultProps}
        currentCount={24}
        maxCount={25}
        onFilesSelected={onFilesSelected}
        onRejected={onRejected}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, [
      makeAudioFile("a.wav"),
      makeAudioFile("b.wav"),
    ]);

    expect(onRejected).toHaveBeenCalledTimes(1);
    expect(onRejected).toHaveBeenCalledWith(
      expect.stringContaining("Only 1 slot remaining"),
    );
    expect(onFilesSelected).not.toHaveBeenCalled();
  });

  it("rejection message uses singular 'slot' when only 1 remains", async () => {
    const onRejected = vi.fn();
    render(
      <UploadButton
        {...defaultProps}
        currentCount={24}
        maxCount={25}
        onRejected={onRejected}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, [
      makeAudioFile("a.wav"),
      makeAudioFile("b.wav"),
    ]);

    expect(onRejected).toHaveBeenCalledWith(
      expect.stringMatching(/1 slot remaining/),
    );
  });

  it("does not call onFilesSelected or onRejected when no valid files are selected", async () => {
    const onFilesSelected = vi.fn();
    const onRejected = vi.fn();
    render(
      <UploadButton
        {...defaultProps}
        currentCount={0}
        onFilesSelected={onFilesSelected}
        onRejected={onRejected}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const imageFile = new File(["img"], "photo.jpg", { type: "image/jpeg" });
    await userEvent.upload(input, [imageFile]);

    expect(onFilesSelected).not.toHaveBeenCalled();
    expect(onRejected).not.toHaveBeenCalled();
  });

  it("accepts files identified by extension when MIME type is missing", async () => {
    const onFilesSelected = vi.fn();
    render(
      <UploadButton
        {...defaultProps}
        currentCount={0}
        onFilesSelected={onFilesSelected}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const fileNoMime = new File(["audio"], "sample.ogg", { type: "" });
    await userEvent.upload(input, [fileNoMime]);

    expect(onFilesSelected).toHaveBeenCalledWith([fileNoMime]);
  });
});
