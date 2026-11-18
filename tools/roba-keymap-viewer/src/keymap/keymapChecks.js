// キーマップの書き込み前チェックと、レイヤー間のつながりの解析。
// 判定はローカルの .keymap だけを根拠にし、実機の状態は推測しない。

const LAYER_PATTERNS = [
  { re: /^&mo (\d+)$/, kind: "momentary" },
  { re: /^&lt (\d+) \S+$/, kind: "momentary" },
  { re: /^&tog (\d+)$/, kind: "toggle" },
  { re: /^&to (\d+)$/, kind: "to" },
  { re: /^&sl (\d+)$/, kind: "sticky" },
];

/** 割り当てが参照するレイヤー。マクロは中身の割り当てまでたどる。 */
export function layerReferences(binding, macros = [], seen = new Set()) {
  const value = String(binding ?? "").trim();
  for (const { re, kind } of LAYER_PATTERNS) {
    const match = re.exec(value);
    if (match) return [{ layer: Number(match[1]), kind }];
  }
  const name = /^&(\w+)/.exec(value)?.[1];
  const macro = name && macros.find((item) => item.name === name);
  if (!macro || seen.has(name)) return [];
  seen.add(name);
  return macro.bindings.flatMap((inner) => layerReferences(inner, macros, seen));
}

function comboActiveOn(combo, layerId) {
  return !combo.layers.length || combo.layers.includes(layerId);
}

/** レイヤーごとに、それを有効にする手段(キー・コンボ・トラックボール)を返す。 */
export function findLayerActivators(document) {
  const activators = new Map(document.layers.map((layer) => [layer.id, []]));
  const add = (layer, item) => activators.get(layer)?.push(item);
  for (const layer of document.layers) {
    layer.bindings.forEach((binding, position) => {
      for (const ref of layerReferences(binding, document.macros)) {
        if (ref.layer !== layer.id) add(ref.layer, { via: "key", fromLayer: layer.id, position, binding, kind: ref.kind });
      }
    });
  }
  for (const combo of document.combos) {
    for (const ref of layerReferences(combo.binding, document.macros)) {
      add(ref.layer, { via: "combo", name: combo.name, fromLayers: combo.layers, binding: combo.binding, kind: ref.kind });
    }
  }
  const automouse = Number(document.trackballSettings?.automouseLayer?.value);
  if (Number.isInteger(automouse)) add(automouse, { via: "automouse", kind: "momentary" });
  return activators;
}

/** default_layer から到達できるレイヤーの集合。 */
export function findReachableLayers(document, activators = findLayerActivators(document)) {
  const reachable = new Set(document.layers.length ? [document.layers[0].id] : []);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [layer, items] of activators) {
      if (reachable.has(layer)) continue;
      const ok = items.some((item) => item.via === "automouse" ||
        (item.via === "key" && reachable.has(item.fromLayer)) ||
        (item.via === "combo" && (!item.fromLayers.length || item.fromLayers.some((id) => reachable.has(id)))));
      if (ok) {
        reachable.add(layer);
        grew = true;
      }
    }
  }
  return reachable;
}

/**
 * 透過キーで実際に効く割り当て。default_layer だけが有効な前提で解決する。
 * 透過でない場合や、解決できない場合は null。
 */
export function resolveTransparent(document, layerId, position) {
  if (!layerId) return null;
  const binding = document.layers[layerId]?.bindings[position];
  if (binding !== "&trans") return null;
  const base = document.layers[0]?.bindings[position];
  return base && base !== "&trans" ? base : null;
}

/** default_layer 上で、指定レイヤーを押している間有効にするキーの位置。 */
export function findLayerOpenerPositions(document, layerId) {
  if (!layerId || !document.layers[0]) return [];
  return document.layers[0].bindings.flatMap((binding, position) => (
    layerReferences(binding, document.macros).some((ref) => ref.layer === layerId && ref.kind === "momentary") ? [position] : []
  ));
}

function canLeaveLayer(document, layerId) {
  const layer = document.layers[layerId];
  const leaves = (binding) => layerReferences(binding, document.macros).some((ref) => (
    ref.kind === "to" || (ref.kind === "toggle" && ref.layer === layerId)
  ));
  const keyLeaves = layer.bindings.some((binding, position) => (
    leaves(binding === "&trans" ? document.layers[0]?.bindings[position] : binding)
  ));
  return keyLeaves || document.combos.some((combo) => comboActiveOn(combo, layerId) && leaves(combo.binding));
}

/**
 * 書き込み前チェック。level は error(動かない可能性が高い)/ warn(意図を確認)/ info(参考)。
 * targets はキーを選ぶための位置。
 */
export function checkKeymap(document, { keyCount, source = "" } = {}) {
  const issues = [];
  const layerCount = document.layers.length;
  const keys = keyCount ?? document.layers[0]?.bindings.length ?? 0;
  const layerName = (id) => document.layers[id]?.name ?? `レイヤー ${id}`;
  const push = (issue) => issues.push({ targets: [], ...issue });

  for (const layer of document.layers) {
    layer.bindings.forEach((binding, position) => {
      for (const ref of layerReferences(binding, document.macros)) {
        if (ref.layer >= layerCount) {
          push({
            level: "error", code: "missing-layer",
            title: `存在しないレイヤー ${ref.layer} を参照しています`,
            detail: `${layer.name} のキー ${position}（${binding}）。レイヤーは 0〜${layerCount - 1} です。`,
            targets: [{ layer: layer.id, position }],
          });
        }
      }
    });
  }
  for (const macro of document.macros) {
    for (const binding of macro.bindings) {
      for (const ref of layerReferences(binding, [])) {
        if (ref.layer >= layerCount) {
          push({ level: "error", code: "missing-layer", title: `マクロ ${macro.name} が存在しないレイヤー ${ref.layer} を参照しています`, detail: binding });
        }
      }
    }
  }

  document.combos.forEach((combo, index) => {
    const outOfRange = combo.positions.filter((position) => position < 0 || position >= keys);
    if (outOfRange.length) {
      push({ level: "error", code: "combo-position", title: `コンボ ${combo.name} の対象キーが範囲外です`, detail: `${outOfRange.join(", ")}（キーは 0〜${keys - 1}）` });
    }
    const badLayers = combo.layers.filter((id) => id < 0 || id >= layerCount);
    if (badLayers.length) {
      push({ level: "error", code: "combo-layer", title: `コンボ ${combo.name} の対象レイヤーが存在しません`, detail: `${badLayers.join(", ")}（レイヤーは 0〜${layerCount - 1}）` });
    }
    if (combo.positions.length < 2) {
      push({ level: "warn", code: "combo-size", title: `コンボ ${combo.name} の対象キーが ${combo.positions.length} 個です`, detail: "コンボは 2 個以上のキーの同時押しで動きます。" });
    }
    const key = [...combo.positions].sort((a, b) => a - b).join(" ");
    for (const other of document.combos.slice(index + 1)) {
      const otherKey = [...other.positions].sort((a, b) => a - b).join(" ");
      const overlap = !combo.layers.length || !other.layers.length || combo.layers.some((id) => other.layers.includes(id));
      if (key === otherKey && overlap) {
        push({
          level: "error", code: "combo-duplicate",
          title: `コンボ ${combo.name} と ${other.name} が同じキーの組み合わせです`,
          detail: `対象キー ${key}。同じレイヤーで両方が有効なため、どちらが動くか決まりません。`,
          targets: combo.positions.filter((position) => position < keys).map((position) => ({ layer: combo.layers[0] ?? 0, position })),
        });
      }
    }
  });

  const activators = findLayerActivators(document);
  const reachable = findReachableLayers(document, activators);
  const conditional = /zmk,conditional-layers/.test(source);
  for (const layer of document.layers.slice(1)) {
    if (!reachable.has(layer.id)) {
      push({
        level: "warn", code: "unreachable-layer",
        title: `${layer.name}（レイヤー ${layer.id}）はどこからも有効になりません`,
        detail: (activators.get(layer.id)?.length
          ? "切り替えるキーはありますが、default_layer からたどれるレイヤーにありません。"
          : "このレイヤーへ切り替えるキー・コンボ・トラックボール設定がありません。") +
          (conditional ? " 条件付きレイヤー（conditional layers）は判定に含めていません。" : ""),
      });
    }
    const entries = activators.get(layer.id) ?? [];
    const latching = entries.filter((item) => item.kind === "to" || item.kind === "toggle");
    if (latching.length && !canLeaveLayer(document, layer.id)) {
      push({
        level: "warn", code: "no-return",
        title: `${layer.name} に入ると戻るキーがありません`,
        detail: "押し続けなくても残る切替（&to / &tog）で入りますが、このレイヤーに &to か同じレイヤーの &tog がありません。",
        targets: latching.filter((item) => item.via === "key").map((item) => ({ layer: item.fromLayer, position: item.position })),
      });
    }
  }

  const base = document.layers[0];
  if (base) {
    const transparent = base.bindings.flatMap((binding, position) => (binding === "&trans" ? [position] : []));
    if (transparent.length) {
      push({
        level: "warn", code: "base-transparent",
        title: `${base.name} に透過キーが ${transparent.length} 個あります`,
        detail: `キー ${transparent.join(", ")}。一番下のレイヤーの透過キーは何も入力しません。`,
        targets: transparent.map((position) => ({ layer: base.id, position })),
      });
    }
  }

  for (const layer of document.layers) {
    const seen = new Map();
    layer.bindings.forEach((binding, position) => {
      if (!/^&kp \S+$/.test(binding)) return;
      seen.set(binding, [...(seen.get(binding) ?? []), position]);
    });
    for (const [binding, positions] of seen) {
      if (positions.length < 2) continue;
      push({
        level: "info", code: "duplicate-key",
        title: `${layer.name} で ${binding} が ${positions.length} か所にあります`,
        detail: `キー ${positions.join(", ")}。意図した配置なら問題ありません。`,
        targets: positions.map((position) => ({ layer: layer.id, position })),
      });
    }
  }

  const order = { error: 0, warn: 1, info: 2 };
  return issues.sort((a, b) => order[a.level] - order[b.level]).map((issue) => ({
    ...issue,
    targets: issue.targets.filter((target) => target.layer < layerCount && target.position < keys),
    layerName: issue.targets[0] ? layerName(issue.targets[0].layer) : "",
  }));
}

export function countIssues(issues) {
  return issues.reduce((counts, issue) => ({ ...counts, [issue.level]: counts[issue.level] + 1 }), { error: 0, warn: 0, info: 0 });
}
