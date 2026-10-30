// Compile/runtime settings shared by every path (renderer, main, offline tools, tests).
import args from '../../dsp/faust-args.json' with { type: 'json' };

export interface FaustArgs {
  args: string[];
  sampleRate: number;
  blockSize: number;
}

export const FAUST: FaustArgs = args as FaustArgs;
