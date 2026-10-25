/** Routes `input` through a compressor into `output`, so loud shots and quiet details sit at a similar level. */
export function connectLevelled(ctx: AudioContext, input: AudioNode, output: AudioNode): void {
  const leveller = ctx.createDynamicsCompressor();
  leveller.threshold.value = -26;
  leveller.knee.value = 18;
  leveller.ratio.value = 6;
  leveller.attack.value = 0.004;
  leveller.release.value = 0.22;
  input.connect(leveller);
  leveller.connect(output);
}
