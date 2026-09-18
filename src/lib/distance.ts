// Photo-based distance estimation for closest-to-pin.
//
// True depth-from-photo requires stereo cameras, LiDAR, or ML monocular
// depth estimation — none of which are reliable enough from a single phone
// photo to trust for a friendly-wager measurement. Instead we use a
// classic photogrammetry trick: a *known-size reference object* in the
// frame gives us a pixels-per-real-world-unit scale, which we then apply
// to the pixel distance between the ball and the hole.
//
// The flagstick is the natural reference on a golf green: USGA Rule 4.1
// products are commonly 7ft (84in) tall, which is what the on-course
// tools below assume (adjustable in the UI if a club uses a different
// length). The photographer taps the flagstick's top & bottom, then the
// ball and the hole, in the CTP capture UI (see ClosestToPinCapture.tsx).
// This keeps the estimate a simple, explainable calibrated measurement
// rather than a black-box guess, and it degrades gracefully to manual
// entry when no flagstick is visible in frame.

export interface PixelPoint {
  x: number;
  y: number;
}

export interface DistanceEstimateInput {
  flagstickTop: PixelPoint;
  flagstickBottom: PixelPoint;
  flagstickHeightInches: number; // default 84 (7ft)
  ballPoint: PixelPoint;
  holePoint: PixelPoint;
}

function pixelDistance(a: PixelPoint, b: PixelPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function estimateDistanceFeet(input: DistanceEstimateInput): number {
  const flagstickPixels = pixelDistance(input.flagstickTop, input.flagstickBottom);
  if (flagstickPixels <= 0) throw new Error("Flagstick reference points must be distinct");

  const inchesPerPixel = input.flagstickHeightInches / flagstickPixels;
  const ballToHolePixels = pixelDistance(input.ballPoint, input.holePoint);
  const inches = ballToHolePixels * inchesPerPixel;

  return Math.round((inches / 12) * 10) / 10;
}
