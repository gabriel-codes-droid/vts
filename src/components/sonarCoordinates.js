// Convert viewport clicks to CSS-pixel canvas coordinates, independent of DPR.
export function rippleOrigin(clientX, clientY, rect, width, height) {
  if (!(rect.width > 0 && rect.height > 0)) return null;
  const x = (clientX - rect.left) * width / rect.width;
  const y = (clientY - rect.top) * height / rect.height;
  return x >= 0 && y >= 0 && x <= width && y <= height ? { x, y } : null;
}
