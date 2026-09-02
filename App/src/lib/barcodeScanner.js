// Hardware scanners and camera scanners both eventually call onDetected(value).
// Keeping that boundary small lets POS pages stay independent from scanner hardware.
export function normalizeBarcode(value) {
  return String(value || "").trim().replace(/\s+/g, "").toUpperCase();
}

export function createCameraBarcodeScanner() {
  let controls;
  let locked = false;
  let stopped = false;

  return {
    isAvailable() {
      return Boolean(navigator.mediaDevices?.getUserMedia);
    },
    async start(videoElement, onDetected, constraints = {}) {
      if (!this.isAvailable()) throw new Error("Camera scanning is not supported by this browser.");
      stopped = false;
      const { BrowserMultiFormatOneDReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatOneDReader(undefined, { delayBetweenScanAttempts: 180 });
      locked = false;
      controls = await reader.decodeFromConstraints({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          ...constraints,
        },
      }, videoElement, (result) => {
        if (!result || locked) return;
        locked = true;
        onDetected(normalizeBarcode(result.getText()));
      });
      if (stopped) {
        controls?.stop();
        controls = undefined;
      }
      return controls;
    },
    async stop() {
      stopped = true;
      controls?.stop();
      controls = undefined;
      locked = false;
    },
    async toggleTorch() {
      if (!controls?.switchTorch) throw new Error("Torch is not available on this camera.");
      await controls.switchTorch();
    },
  };
}
