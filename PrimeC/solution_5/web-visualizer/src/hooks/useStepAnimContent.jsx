/**
 * Builds the pre-rendered JSX fragment used in the canvas stage.
 * AllEventsTransport is no longer rendered inside the detail panel,
 * so allEventsTransportContent is always null.
 *
 * Returning JSX from a custom hook is valid React — it's the "render prop
 * without prop" pattern, keeping Visualizer.jsx's return block clean.
 */
export function useStepAnimContent() {
  return { allEventsTransportContent: null };
}
