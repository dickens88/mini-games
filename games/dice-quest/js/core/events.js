// The simulation never draws or plays sounds. It records what happened in
// state.events; the page drains the list each frame and hands it to the
// renderer and the audio, and the balance script simply ignores it.

export function emit(state, type, data) {
  state.events.push(Object.assign({ type }, data));
}

export function drain(state) {
  const out = state.events;
  state.events = [];
  return out;
}
