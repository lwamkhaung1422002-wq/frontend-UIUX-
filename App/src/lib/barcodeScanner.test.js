import { beforeEach, describe, expect, it, vi } from "vitest";

const controls = { stop: vi.fn() };
const decodeFromConstraints = vi.fn();

vi.mock("@zxing/browser", () => ({
  BrowserMultiFormatOneDReader: class {
    decodeFromConstraints(...args) {
      return decodeFromConstraints(...args);
    }
  },
}));

import { createCameraBarcodeScanner, normalizeBarcode } from "./barcodeScanner";

describe("barcode scanner", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });
    controls.stop.mockClear();
    decodeFromConstraints.mockReset();
  });

  it("normalizes detected values without changing barcode content", () => {
    expect(normalizeBarcode("  ab 12  ")).toBe("AB12");
  });

  it("stops a camera stream that resolves after the dialog has closed", async () => {
    let resolveControls;
    decodeFromConstraints.mockImplementationOnce(() => new Promise((resolve) => {
      resolveControls = resolve;
    }));
    const scanner = createCameraBarcodeScanner();
    const start = scanner.start(document.createElement("video"), vi.fn());

    await vi.dynamicImportSettled();
    expect(decodeFromConstraints).toHaveBeenCalledTimes(1);
    await scanner.stop();
    resolveControls(controls);
    await start;

    expect(controls.stop).toHaveBeenCalledTimes(1);
  });
});
