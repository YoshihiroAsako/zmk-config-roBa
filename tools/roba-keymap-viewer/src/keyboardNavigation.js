// 図の左右分割や段差を保ったまま、指定方向にある近いキーへ移動する。
export function nextKeyPosition(keys, position, key) {
  if (!keys.length) return position;
  if (key === "Home") return keys[0].position;
  if (key === "End") return keys.at(-1).position;
  const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[key];
  const current = keys.find((item) => item.position === position);
  if (!direction || !current) return position;
  const [dx, dy] = direction;
  const candidates = keys.flatMap((item) => {
    const x = item.x - current.x;
    const y = item.y - current.y;
    const forward = x * dx + y * dy;
    const across = Math.abs(x * dy - y * dx);
    return forward > 0.5 ? [{ position: item.position, score: forward + across * 3 }] : [];
  });
  candidates.sort((a, b) => a.score - b.score);
  return candidates[0]?.position ?? position;
}

// 中間の Tab 移動はブラウザに任せ、端だけ循環させる。
export function focusWrapTarget(elements, active, backwards) {
  if (!elements.length) return null;
  if (!elements.includes(active)) return backwards ? elements.at(-1) : elements[0];
  if (backwards && active === elements[0]) return elements.at(-1);
  if (!backwards && active === elements.at(-1)) return elements[0];
  return null;
}
