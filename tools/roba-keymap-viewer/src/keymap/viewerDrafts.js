export function rebaseAfterKeySave(changes, saved) {
  const offset = saved.nextRaw.length - (saved.range.end - saved.range.start);
  return changes.filter((change) => change.id !== saved.id).map((change) => {
    if (!offset || change.range.start < saved.range.end) return change;
    return {
      ...change,
      range: { start: change.range.start + offset, end: change.range.end + offset },
    };
  });
}

export function rebaseHistoryAfterKeySave(history, current, saved) {
  const rebased = history.map((changes) => rebaseAfterKeySave(changes, saved));
  return rebased.filter((changes, index) => (
    JSON.stringify(changes) !== JSON.stringify(rebased[index + 1] ?? current)
  ));
}

export function getKeyboardChanges(saved, edited, layerId) {
  const before = saved.layers[layerId];
  const after = edited.layers[layerId];
  const changes = new Map();
  const mark = (position, message) => {
    const messages = changes.get(position) ?? [];
    messages.push(message);
    changes.set(position, messages);
  };
  const savedMacros = new Map(saved.macros.map((macro) => [macro.name, macro.raw]));
  const changedMacros = new Set(edited.macros.filter((macro) => (
    savedMacros.get(macro.name) !== macro.raw
  )).map((macro) => macro.name));
  const referencedMacro = (binding) => binding.match(/^&(\w+)/)?.[1];
  after.bindings.forEach((binding, position) => {
    if (before.bindings[position] !== binding) mark(position, `${before.bindings[position]} → ${binding}`);
    const macroName = referencedMacro(binding);
    if (changedMacros.has(macroName)) mark(position, `マクロ ${macroName} を変更`);
  });

  const savedCombos = new Map(saved.combos.map((combo) => [combo.name, combo]));
  for (const combo of edited.combos) {
    const original = savedCombos.get(combo.name);
    const activePositions = (node) => node && (!node.layers.length || node.layers.includes(layerId))
      ? node.positions
      : [];
    if (original?.raw !== combo.raw) {
      for (const position of new Set([...activePositions(original), ...activePositions(combo)])) {
        mark(position, `コンボ ${combo.name} を${original ? "変更" : "追加"}`);
      }
    }
    const macroName = referencedMacro(combo.binding);
    if (changedMacros.has(macroName)) {
      for (const position of activePositions(combo)) {
        mark(position, `コンボ ${combo.name} のマクロ ${macroName} を変更`);
      }
    }
  }
  return changes;
}
