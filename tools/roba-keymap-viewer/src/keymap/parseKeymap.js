function findBlock(source, name) {
  const match = new RegExp(`(?:^|\\s)${name}\\s*\\{`).exec(source);
  if (!match) return null;
  const open = source.indexOf("{", match.index);
  const close = findMatchingBrace(source, open);
  if (close < 0) return null;
  return {
    name,
    start: open,
    end: close,
    body: source.slice(open + 1, close),
    raw: source.slice(match.index, close + 1),
  };
}

function findMatchingBrace(source, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function directChildBlocks(body) {
  const children = [];
  let cursor = 0;
  while (cursor < body.length) {
    const open = body.indexOf("{", cursor);
    if (open < 0) break;
    const close = findMatchingBrace(body, open);
    if (close < 0) break;

    const prefix = body.slice(0, open);
    const boundary = Math.max(prefix.lastIndexOf(";"), prefix.lastIndexOf("}"));
    const head = prefix.slice(boundary + 1).trim();
    const name = getNodeName(head);

    if (name) {
      children.push({
        name,
        rawHead: head,
        body: body.slice(open + 1, close),
        raw: body.slice(boundary + 1, close + 1).trim(),
      });
    }
    cursor = close + 1;
  }
  return children;
}

function getNodeName(head) {
  if (!head) return "";
  const afterLabel = head.includes(":") ? head.split(":").pop().trim() : head;
  const parts = afterLabel.split(/\s+/).filter(Boolean);
  return parts.at(-1)?.replace(/[^A-Za-z0-9_-]/g, "") || "";
}

function getAngleProperty(body, propName) {
  const match = new RegExp(`${propName}\\s*=\\s*<([\\s\\S]*?)>\\s*;`).exec(body);
  return match ? match[1] : "";
}

function getStringProperty(body, propName) {
  const match = new RegExp(`${propName}\\s*=\\s*"([^"]*)"\\s*;`).exec(body);
  return match ? match[1] : "";
}

function getNumberProperty(body, propName) {
  const match = new RegExp(`${propName}\\s*=\\s*<([0-9]+)>\\s*;`).exec(body);
  return match ? Number(match[1]) : null;
}

function splitBindingExpressions(value) {
  return value
    .replace(/\/\/.*$/gm, "")
    .split(/(?=&)/g)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function parseCombos(source) {
  const block = findBlock(source, "combos");
  if (!block) return [];

  return directChildBlocks(block.body)
    .filter((child) => child.name !== "compatible")
    .map((child) => {
      const positions = getAngleProperty(child.body, "key-positions")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(Number);
      return {
        name: child.name,
        positions,
        binding: splitBindingExpressions(getAngleProperty(child.body, "bindings"))[0] || "",
        timeoutMs: getNumberProperty(child.body, "timeout-ms") ?? 50,
        layers: getAngleProperty(child.body, "layers")
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map(Number),
      };
    });
}

function parseMacros(source) {
  const block = findBlock(source, "macros");
  if (!block) return [];

  return directChildBlocks(block.body).map((child) => ({
    name: child.name,
    compatible: getStringProperty(child.body, "compatible"),
    bindingCells: getNumberProperty(child.body, "#binding-cells"),
    bindings: splitBindingExpressions(getAngleProperty(child.body, "bindings")),
    label: getStringProperty(child.body, "label"),
    raw: child.raw,
  }));
}

function parseBehaviors(source) {
  const block = findBlock(source, "behaviors");
  const custom = block
    ? directChildBlocks(block.body).map((child) => ({
        name: child.name,
        compatible: getStringProperty(child.body, "compatible"),
        bindingCells: getNumberProperty(child.body, "#binding-cells"),
        label: getStringProperty(child.body, "label"),
        bindings: splitBindingExpressions(getAngleProperty(child.body, "bindings")),
        raw: child.raw,
      }))
    : [];

  const reconfigured = [];
  const mtBlock = findBlock(source, "&mt");
  if (mtBlock) {
    reconfigured.push({
      name: "&mt",
      compatible: "zmk,behavior-hold-tap",
      label: "Mod-tap reconfiguration",
      bindings: [],
      raw: mtBlock.raw,
    });
  }
  if (source.includes("&trackball")) {
    const automouse = /automouse-layer\s*=\s*<([0-9]+)>/.exec(source)?.[1];
    const scroll = /scroll-layers\s*=\s*<([0-9]+)>/.exec(source)?.[1];
    reconfigured.push({
      name: "&trackball",
      compatible: "zmk,trackball",
      label: `automouse-layer ${automouse ?? "?"}, scroll-layers ${scroll ?? "?"}`,
      bindings: [],
      raw: "&trackball configuration",
    });
  }

  return [...custom, ...reconfigured];
}

export function parseKeymap(source) {
  const keymap = findBlock(source, "keymap");
  const layerBlocks = keymap ? directChildBlocks(keymap.body) : [];
  const layers = layerBlocks.map((layer, index) => ({
    id: index,
    name: layer.name,
    bindings: splitBindingExpressions(getAngleProperty(layer.body, "bindings")),
    sensorBindings: splitBindingExpressions(getAngleProperty(layer.body, "sensor-bindings")),
    raw: layer.raw,
  }));

  return {
    layers,
    combos: parseCombos(source),
    macros: parseMacros(source),
    behaviors: parseBehaviors(source),
  };
}

export function countDtsPhysicalKeys(source) {
  return (source.match(/&key_physical_attrs/g) || []).length;
}
