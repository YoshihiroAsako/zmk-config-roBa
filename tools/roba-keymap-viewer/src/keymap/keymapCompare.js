// 2 つのキーマップの違いを、レイヤー・キー・コンボ・マクロ単位の文章にする。
// from = 今のファイル、to = 戻す先(バックアップ)として「戻すと何が変わるか」を表す。

function byName(items) {
  return new Map(items.map((item) => [item.name, item]));
}

function describeCombo(combo) {
  const layers = combo.layers.length ? `レイヤー ${combo.layers.join(" ")}` : "全レイヤー";
  return `${combo.binding}・キー ${combo.positions.join("+")}・${layers}・${combo.timeoutMs}ms`;
}

function sensorText(layer) {
  return layer?.sensorBindings?.map((binding) => binding.raw).join(" ") || "なし";
}

export function compareKeymaps(from, to) {
  const items = [];
  const layerCount = Math.max(from.layers.length, to.layers.length);
  for (let id = 0; id < layerCount; id += 1) {
    const before = from.layers[id];
    const after = to.layers[id];
    if (!before) {
      items.push({ area: "layer", text: `レイヤー ${id}（${after.name}）が追加されます` });
      continue;
    }
    if (!after) {
      items.push({ area: "layer", text: `レイヤー ${id}（${before.name}）がなくなります` });
      continue;
    }
    if (before.name !== after.name) {
      items.push({ area: "layer", text: `レイヤー ${id} の名前: ${before.name} → ${after.name}` });
    }
    const keys = Math.max(before.bindings.length, after.bindings.length);
    for (let position = 0; position < keys; position += 1) {
      const a = before.bindings[position];
      const b = after.bindings[position];
      if (a !== b) {
        items.push({ area: "key", layer: id, position, text: `${after.name} キー ${position}: ${a ?? "なし"} → ${b ?? "なし"}` });
      }
    }
    if (sensorText(before) !== sensorText(after)) {
      items.push({ area: "sensor", text: `${after.name} のエンコーダー: ${sensorText(before)} → ${sensorText(after)}` });
    }
  }

  const fromCombos = byName(from.combos);
  const toCombos = byName(to.combos);
  for (const [name, combo] of toCombos) {
    const current = fromCombos.get(name);
    if (!current) items.push({ area: "combo", text: `コンボ ${name} が追加されます（${describeCombo(combo)}）` });
    else if (describeCombo(current) !== describeCombo(combo)) {
      items.push({ area: "combo", text: `コンボ ${name}: ${describeCombo(current)} → ${describeCombo(combo)}` });
    }
  }
  for (const name of fromCombos.keys()) {
    if (!toCombos.has(name)) items.push({ area: "combo", text: `コンボ ${name} がなくなります` });
  }

  const fromMacros = byName(from.macros);
  const toMacros = byName(to.macros);
  for (const [name, macro] of toMacros) {
    const current = fromMacros.get(name);
    if (!current) items.push({ area: "macro", text: `マクロ ${name} が追加されます` });
    else if (current.raw !== macro.raw) {
      items.push({ area: "macro", text: `マクロ ${name}: ${current.bindings.join(" ")} → ${macro.bindings.join(" ")}` });
    }
  }
  for (const name of fromMacros.keys()) {
    if (!toMacros.has(name)) items.push({ area: "macro", text: `マクロ ${name} がなくなります` });
  }

  const trackball = (doc) => [
    doc.trackballSettings?.automouseLayer?.value?.trim() ?? "なし",
    doc.trackballSettings?.scrollLayers?.raw?.trim() ?? "なし",
  ];
  const [fromAuto, fromScroll] = trackball(from);
  const [toAuto, toScroll] = trackball(to);
  if (fromAuto !== toAuto) items.push({ area: "trackball", text: `自動マウスのレイヤー: ${fromAuto} → ${toAuto}` });
  if (fromScroll !== toScroll) items.push({ area: "trackball", text: `スクロールのレイヤー: ${fromScroll} → ${toScroll}` });
  return items;
}
