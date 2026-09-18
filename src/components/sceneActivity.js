// A mesh can be locally visible while an ancestor hides its entire scene.
export function isSceneVisible(object) {
  if (!object) return false;
  for (let node = object; node; node = node.parent) {
    if (!node.visible) return false;
  }
  return true;
}
