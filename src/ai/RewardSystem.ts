import { WorldState } from "../core/World";

export interface RewardSignal {
  readonly value: number;
  readonly reason: string;
}

export class RewardSystem {
  public evaluate(_worldState: WorldState): RewardSignal {
    return {
      value: 0,
      reason: "Baseline reward not implemented yet."
    };
  }
}
