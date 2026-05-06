import { describeBinding } from "../keymap/bindingDisplay.js";

export function buildMarkdown(document) {
  const layerNames = document.layers.map((layer) => layer.name);
  const lines = ["# roBa Keymap", "", "Source: `config/roBa.keymap` and `config/roBa.json`", ""];

  for (const layer of document.layers) {
    lines.push(`## Layer ${layer.id}: ${layer.name}`, "");
    lines.push("| Position | Display | Binding | Kind | Notes |");
    lines.push("| --- | --- | --- | --- | --- |");
    layer.bindings.forEach((binding, position) => {
      const parsed = describeBinding(binding, layerNames);
      lines.push(
        `| ${position} | ${escapeCell(parsed.display)} | \`${escapeCell(binding)}\` | ${parsed.kind} | ${escapeCell(parsed.note)} |`,
      );
    });
    lines.push("");
  }

  lines.push("## Combos", "");
  lines.push("| Name | Positions | Binding | Layers | Timeout |");
  lines.push("| --- | --- | --- | --- | --- |");
  document.combos.forEach((combo) => {
    lines.push(
      `| ${combo.name} | ${combo.positions.join(" + ")} | \`${combo.binding}\` | ${combo.layers.join(", ") || "all"} | ${combo.timeoutMs}ms |`,
    );
  });
  lines.push("");

  lines.push("## Sensor Bindings", "");
  lines.push("| Layer | Binding |");
  lines.push("| --- | --- |");
  document.layers
    .filter((layer) => layer.sensorBindings.length)
    .forEach((layer) => {
      layer.sensorBindings.forEach((binding) => {
        lines.push(`| ${layer.name} | \`${binding.raw}\` |`);
      });
    });
  lines.push("");

  lines.push("## Macros", "");
  lines.push("| Name | Compatible | Bindings |");
  lines.push("| --- | --- | --- |");
  document.macros.forEach((macro) => {
    lines.push(`| ${macro.name} | ${macro.compatible || ""} | \`${macro.bindings.join(" ; ")}\` |`);
  });
  lines.push("");

  lines.push("## Behaviors", "");
  lines.push("| Name | Compatible | Label |");
  lines.push("| --- | --- | --- |");
  document.behaviors.forEach((behavior) => {
    lines.push(`| ${behavior.name} | ${behavior.compatible || ""} | ${escapeCell(behavior.label || "")} |`);
  });

  return lines.join("\n");
}

function escapeCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}
