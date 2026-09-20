export const DIGIT_DURATION = 45;
export const DIGIT_INTERVAL = 55;

// Each clipped column owns one two-cell strip. Incoming/outgoing digits
// share a transform, so they cannot collide or accumulate stale animations.
export function createRollingCounter(container, reducedMotion = false) {
  container.replaceChildren();
  const columns = [' ', ' ', '0'].map(value => {
    const slot = document.createElement('span');
    slot.className = 'boot-digit';
    const strip = document.createElement('span');
    strip.className = 'boot-digit-strip';
    const incoming = document.createElement('span');
    const current = document.createElement('span');
    incoming.textContent = current.textContent = value;
    strip.append(incoming);
    strip.append(current);
    slot.append(strip);
    container.append(slot);
    return { strip, incoming, current, value, animation: null };
  });
  return {
    set(value) {
      const digits = String(value).padStart(3, ' ');
      columns.forEach((column, index) => {
        const next = digits[index];
        if (next === column.value) return;
        column.animation?.cancel();
        column.current.textContent = column.value;
        column.incoming.textContent = next;
        column.value = next;
        if (reducedMotion || !column.strip.animate) {
          column.current.textContent = next;
          return;
        }
        const animation = column.strip.animate([
          { transform: 'translate3d(0, -50%, 0)' },
          { transform: 'translate3d(0, 0, 0)' },
        ], { duration: DIGIT_DURATION, easing: 'cubic-bezier(.25,.1,.25,1)', fill: 'forwards' });
        column.animation = animation;
        animation.onfinish = () => {
          if (column.animation !== animation) return;
          column.current.textContent = next;
          animation.cancel();
          column.animation = null;
        };
      });
    },
    dispose() { columns.forEach(column => column.animation?.cancel()); },
  };
}
