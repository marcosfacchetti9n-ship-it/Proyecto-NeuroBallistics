import { WorldState } from "../core/World";

export interface AgentControlSignal {
  readonly targetAngle: number;
  readonly fire: boolean;
}

export interface AgentInterface {
  observe(worldState: WorldState): void;
  decide(): AgentControlSignal;
}
