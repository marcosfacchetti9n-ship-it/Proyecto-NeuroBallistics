import { AgentControlSignal, AgentInterface } from "./AgentInterface";
import { WorldState } from "../core/World";

/**
 * Baseline deterministic brain. Intended to be replaced by adaptive policies later.
 */
export class Brain implements AgentInterface {
  private latestWorldState: WorldState | null = null;

  public observe(worldState: WorldState): void {
    this.latestWorldState = worldState;
  }

  public decide(): AgentControlSignal {
    const bodyCount = this.latestWorldState?.bodies.length ?? 0;
    return {
      targetAngle: bodyCount > 0 ? 0 : 0,
      fire: false
    };
  }
}
