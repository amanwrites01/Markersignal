import teardown from "./teardown";

// Vitest global setup: nothing to prepare; clean up after the whole run.
export default function setup() {
  return teardown;
}
