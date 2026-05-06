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

function directChildBlocks(body, baseOffset = 0) {
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
      const rawStart = boundary + 1;
      let nameEnd = open;
      while (nameEnd > rawStart && /\s/.test(body[nameEnd - 1])) nameEnd -= 1;
      const nameStart = nameEnd - name.length;
      const nameRange = nameStart >= rawStart && body.slice(nameStart, nameEnd) === name
        ? { start: baseOffset + nameStart, end: baseOffset + nameEnd }
        : undefined;
      children.push({
        name,
        rawHead: head,
        body: body.slice(open + 1, close),
        bodyStart: baseOffset + open + 1,
        bodyEnd: baseOffset + close,
        raw: body.slice(boundary + 1, close + 1).trim(),
        rawStart: baseOffset + rawStart,
        rawEnd: baseOffset + close + 1,
        nameRange,
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
  return getAnglePropertyInfo(body, propName)?.value || "";
}

function getAnglePropertyInfo(body, propName, baseOffset = 0) {
  const match = new RegExp(`${propName}\\s*=\\s*<([\\s\\S]*?)>\\s*;`).exec(body);
  if (!match) return null;

  const valueStart = body.indexOf("<", match.index) + 1;
  const valueEnd = body.indexOf(">", valueStart);
  if (valueStart < 1 || valueEnd < valueStart) return null;

  return {
    value: body.slice(valueStart, valueEnd),
    sourceRange: {
      start: baseOffset + valueStart,
      end: baseOffset + valueEnd,
    },
  };
}

function maskComments(text) {
  let result = text.replace(/\/\*[\s\S]*?\*\//g, (match) =>
    match.replace(/[^\n\r]/g, " "),
  );
  result = result.replace(/\/\/[^\n]*/g, (match) => " ".repeat(match.length));
  return result;
}

export function parseTrackballSettings(source) {
  const block = findBlock(source, "&trackball");
  if (!block) return null;

  const bodyStart = block.start + 1;
  const body = source.slice(bodyStart, block.end);
  const maskedBody = maskComments(body);

  const automouseInfo = getAnglePropertyInfo(maskedBody, "automouse-layer", bodyStart);
  const scrollInfo = getAnglePropertyInfo(maskedBody, "scroll-layers", bodyStart);

  return {
    automouseLayer: automouseInfo
      ? {
          value: source.slice(automouseInfo.sourceRange.start, automouseInfo.sourceRange.end),
          sourceRange: automouseInfo.sourceRange,
        }
      : null,
    scrollLayers: scrollInfo
      ? {
          raw: source.slice(scrollInfo.sourceRange.start, scrollInfo.sourceRange.end),
          values: source
            .slice(scrollInfo.sourceRange.start, scrollInfo.sourceRange.end)
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map(Number),
          sourceRange: scrollInfo.sourceRange,
        }
      : null,
  };
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
  return splitBindingEntries(value).map((entry) => entry.raw);
}

function parseSensorBindings(body, bodyStart = 0) {
  const propInfo = getAnglePropertyInfo(body, "sensor-bindings", bodyStart);
  if (!propInfo) return [];
  const entries = splitBindingEntries(propInfo.value, propInfo.sourceRange.start);
  return entries.map((entry) => {
    const tokens = entry.raw.trim().split(/\s+/);
    const behavior = tokens[0] || "";
    const isIncDecBehavior = behavior === "&inc_dec_kp" || behavior === "&inc_dec_cp";
    return {
      raw: entry.raw,
      sourceRange: entry.sourceRange,
      behavior,
      incKey: isIncDecBehavior ? (tokens[1] ?? null) : null,
      decKey: isIncDecBehavior ? (tokens[2] ?? null) : null,
    };
  });
}

function splitBindingEntries(value, sourceStart = 0) {
  const starts = findBindingStarts(value);
  return starts
    .map((start, index) => {
      const nextStart = starts[index + 1] ?? value.length;
      const end = trimBindingExpressionEnd(value, start, nextStart);
      const raw = value.slice(start, end).replace(/\s+/g, " ").trim();
      return {
        raw,
        sourceRange: {
          start: sourceStart + start,
          end: sourceStart + end,
        },
      };
    })
    .filter((entry) => entry.raw);
}

function findBindingStarts(value) {
  const starts = [];
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "/" && value[index + 1] === "/") {
      index = findLineEnd(value, index);
      continue;
    }
    if (value[index] === "&") starts.push(index);
  }
  return starts;
}

function trimBindingExpressionEnd(value, start, fallbackEnd) {
  let end = fallbackEnd;
  for (let index = start; index < fallbackEnd; index += 1) {
    if (value[index] === "/" && value[index + 1] === "/") {
      end = index;
      break;
    }
  }

  while (end > start && /\s/.test(value[end - 1])) end -= 1;
  return end;
}

function findLineEnd(value, start) {
  const newline = value.indexOf("\n", start);
  return newline < 0 ? value.length : newline;
}

function parseCombos(source) {
  const block = findBlock(source, "combos");
  if (!block) return [];

  return directChildBlocks(block.body, block.start + 1)
    .filter((child) => child.name !== "compatible")
    .map((child) => {
      const positionsProperty = getAnglePropertyInfo(child.body, "key-positions", child.bodyStart);
      const bindingsProperty = getAnglePropertyInfo(child.body, "bindings", child.bodyStart);
      const layersProperty = getAnglePropertyInfo(child.body, "layers", child.bodyStart);
      const timeoutMsProperty = getAnglePropertyInfo(child.body, "timeout-ms", child.bodyStart);
      const bindingEntries = bindingsProperty
        ? splitBindingEntries(bindingsProperty.value, bindingsProperty.sourceRange.start)
        : [];

      const positions = (positionsProperty?.value || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(Number);
      const timeoutMsParsed = Number((timeoutMsProperty?.value || "").trim());
      return {
        name: child.name,
        positions,
        binding: bindingEntries[0]?.raw || "",
        bindingEntry: bindingEntries[0],
        keyPositionsRange: positionsProperty?.sourceRange,
        timeoutMs: Number.isFinite(timeoutMsParsed) && timeoutMsProperty ? timeoutMsParsed : 50,
        timeoutMsRange: timeoutMsProperty?.sourceRange,
        layers: (layersProperty?.value || "")
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map(Number),
        layersRange: layersProperty?.sourceRange,
        sourceRange: {
          start: child.rawStart,
          end: child.rawEnd,
        },
        bodyRange: {
          start: child.bodyStart,
          end: child.bodyEnd,
        },
        raw: child.raw,
      };
    });
}

function parseMacros(source) {
  const block = findBlock(source, "macros");
  if (!block) return [];

  return directChildBlocks(block.body, block.start + 1)
    .filter((child) => child.name !== "compatible")
    .map((child) => {
      const bindingsProperty = getAnglePropertyInfo(child.body, "bindings", child.bodyStart);
      const waitMsProperty = getAnglePropertyInfo(child.body, "wait-ms", child.bodyStart);
      const tapMsProperty = getAnglePropertyInfo(child.body, "tap-ms", child.bodyStart);
      const bindingEntries = bindingsProperty
        ? splitBindingEntries(bindingsProperty.value, bindingsProperty.sourceRange.start)
        : [];
      const waitMsParsed = Number((waitMsProperty?.value || "").trim());
      const tapMsParsed = Number((tapMsProperty?.value || "").trim());

      return {
        name: child.name,
        compatible: getStringProperty(child.body, "compatible"),
        bindingCells: getNumberProperty(child.body, "#binding-cells"),
        bindings: bindingEntries.map((entry) => entry.raw),
        bindingEntries,
        bindingsRange: bindingsProperty?.sourceRange,
        waitMs: Number.isFinite(waitMsParsed) && waitMsProperty ? waitMsParsed : null,
        waitMsRange: waitMsProperty?.sourceRange,
        tapMs: Number.isFinite(tapMsParsed) && tapMsProperty ? tapMsParsed : null,
        tapMsRange: tapMsProperty?.sourceRange,
        label: getStringProperty(child.body, "label"),
        sourceRange: {
          start: child.rawStart,
          end: child.rawEnd,
        },
        bodyRange: {
          start: child.bodyStart,
          end: child.bodyEnd,
        },
        raw: child.raw,
      };
    });
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
  const layerBlocks = keymap ? directChildBlocks(keymap.body, keymap.start + 1) : [];
  const layers = layerBlocks.map((layer, index) => {
    const bindingProperty = getAnglePropertyInfo(layer.body, "bindings", layer.bodyStart);
    const bindingEntries = bindingProperty
      ? splitBindingEntries(bindingProperty.value, bindingProperty.sourceRange.start)
      : [];

    return {
      id: index,
      name: layer.name,
      nameRange: layer.nameRange,
      bindings: bindingEntries.map((entry) => entry.raw),
      bindingEntries,
      sensorBindings: parseSensorBindings(layer.body, layer.bodyStart),
      sourceRange: {
        start: layer.rawStart,
        end: layer.rawEnd,
      },
      bodyRange: {
        start: layer.bodyStart,
        end: layer.bodyEnd,
      },
      raw: layer.raw,
    };
  });

  return {
    layers,
    combos: parseCombos(source),
    macros: parseMacros(source),
    behaviors: parseBehaviors(source),
    trackballSettings: parseTrackballSettings(source),
  };
}

export function countDtsPhysicalKeys(source) {
  return (source.match(/&key_physical_attrs/g) || []).length;
}

export function replaceBinding(source, range, nextRaw) {
  validateSourceRange(source, range);
  validateEditableBindingExpression(nextRaw);
  return `${source.slice(0, range.start)}${nextRaw}${source.slice(range.end)}`;
}

export function replaceBindings(source, replacements) {
  const ordered = [...replacements].sort((a, b) => b.range.start - a.range.start);
  for (let index = 0; index < ordered.length; index += 1) {
    validateSourceRange(source, ordered[index].range);
    validateEditableBindingExpression(ordered[index].nextRaw);
    const next = ordered[index + 1];
    if (next && next.range.end > ordered[index].range.start) {
      throw new Error("Replacement ranges must not overlap.");
    }
  }

  return ordered.reduce(
    (updated, replacement) => replaceBinding(updated, replacement.range, replacement.nextRaw),
    source,
  );
}

function validateSourceRange(source, range) {
  if (
    !range ||
    !Number.isInteger(range.start) ||
    !Number.isInteger(range.end) ||
    range.start < 0 ||
    range.end < range.start ||
    range.end > source.length
  ) {
    throw new Error("Invalid source range.");
  }

  const currentRaw = source.slice(range.start, range.end).trim();
  const entries = splitBindingEntries(source.slice(range.start, range.end), range.start);
  if (
    !currentRaw.startsWith("&") ||
    entries.length !== 1 ||
    entries[0].sourceRange.start !== range.start ||
    entries[0].sourceRange.end !== range.end
  ) {
    throw new Error("Source range must cover one binding expression.");
  }
}

function validateEditableBindingExpression(nextRaw) {
  if (typeof nextRaw !== "string" || nextRaw !== nextRaw.trim() || nextRaw.length === 0) {
    throw new Error("Replacement binding must be a trimmed string.");
  }
  if (/[<>\r\n;]/.test(nextRaw)) {
    throw new Error("Replacement binding contains unsupported characters.");
  }
  if (isEditableBindingExpression(nextRaw)) return;
  throw new Error("Replacement binding is not supported in Phase 2.");
}

export function isEditableBindingExpression(raw) {
  return raw === "&trans" ||
    raw === "&none" ||
    /^&kp \S+$/.test(raw) ||
    /^&mo \d+$/.test(raw) ||
    /^&lt \d+ \S+$/.test(raw) ||
    /^&mt \S+ \S+$/.test(raw);
}
