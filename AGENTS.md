# AGENTS.md

This file is the single source of truth for AI coding agents working in this repository.
Respond to the user in Japanese unless they explicitly ask otherwise.

## Project Overview

`zmk-config-roBa` is a ZMK Firmware configuration repository for the roBa split keyboard.

- MCU: `seeeduino_xiao_ble` (nRF52840)
- Firmware: ZMK Firmware, pinned to `v0.3-branch` in `config/west.yml`
- Trackball driver: `kumamuk-git/zmk-pmw3610-driver`
- Builds: GitHub Actions matrix in `build.yaml` builds `roBa_L`, `roBa_R`, and `settings_reset`

## Hardware And Side Roles

Treat physical hardware placement and Kconfig flags as separate concepts.

- Physically, `roBa_L` is the left half with the encoder.
- Physically, `roBa_R` is the right half with the PMW3610 trackball and SPI wiring.
- `CONFIG_EC11` and `CONFIG_ZMK_POINTING` intentionally appear in both side `.conf` files. Do not delete them just because only one physical half has the related hardware.
- ZMK Studio is enabled on `roBa_R`. Keep `build.yaml`'s `snippet: studio-rpc-usb-uart` together with `boards/shields/roBa/roBa_R.conf` settings such as `CONFIG_ZMK_STUDIO=y` and `CONFIG_ZMK_STUDIO_LOCKING=n`.

## Repository Map

- High-touch files:
  - `config/roBa.keymap`: main ZMK keymap
  - `keymap-drawer/roBa.yaml`: keymap-drawer source
  - `keymap-drawer/roBa.svg`: generated visual keymap
- Medium-touch files:
  - `boards/shields/roBa/*.conf`
  - `boards/shields/roBa/*.overlay`
- Low-touch files:
  - `build.yaml`
  - `config/west.yml`
  - `boards/shields/roBa/*.dtsi`
- Avoid editing unless there is a clear reason:
  - `zephyr/`
  - `.west/`
  - `boards/shields/roBa/Kconfig.*`

## Workflow

For keymap changes:

1. Edit `config/roBa.keymap`.
2. If the visible layout changes, update `keymap-drawer/roBa.yaml`.
3. Regenerate `keymap-drawer/roBa.svg` and include it in the same commit.

Example keymap-drawer commands:

```bash
keymap parse -c 10 -z config/roBa.keymap > keymap-drawer/roBa.yaml
keymap draw keymap-drawer/roBa.yaml > keymap-drawer/roBa.svg
```

Before overwriting `keymap-drawer/roBa.yaml`, check whether it contains manual adjustments and review the diff afterward.

For firmware validation:

- Do not assume local hardware builds are available.
- Prefer pushing and confirming the GitHub Actions build.
- After Actions succeeds, use the generated `.uf2` artifacts for device flashing.
- DeviceTree build success is only a minimum check; it does not prove real hardware behavior.

## Editing Rules

- Keep new layer names meaningful, such as `default_layer`, `lower`, `raise`, `adjust`, or `mouse`.
- Do not automatically rename existing numbered layers such as `layer_6`; they may be referenced by `&lt`, `&mo`, keymap-drawer, or custom behaviors.
- Add short comments for new non-obvious behavior definitions, especially hold-tap timing parameters.
- Keep combos and macros in their own sections rather than scattering inline definitions.
- Add comments to non-obvious `.conf` values, especially sensor tuning, sleep timing, power, and communication settings. Do not comment every self-explanatory Kconfig line.
- Keep common L/R settings aligned when they are meant to be common, such as battery reporting and split BLE settings.
- Do not make side-specific settings symmetrical by default. PMW3610, SPI, ZMK Studio, and encoder settings may intentionally live on only one side.
- Treat `config/roBa.json` as keymap-editor metadata. When changing layout shape or key counts, check consistency with `config/roBa.keymap` and keymap-drawer files.

## Dependency And Build Rules

- Do not change `config/west.yml` revisions unless explicitly asked.
- If changing the ZMK revision or `zmk-pmw3610-driver` revision, do it as a separate change from keymap or hardware edits.
- Preserve the order of `build.yaml`'s `include` matrix unless there is a reason to reorder it.
- Do not remove or move the `roBa_R` `snippet: studio-rpc-usb-uart` as a cleanup.

## Commit And PR Guidance

- Commit messages may be English or Japanese. Make the reason for the change clear.
- Keep keymap changes, `.conf` setting changes, and shield/DeviceTree changes in separate commits when practical.
- Include `keymap-drawer/roBa.svg` with visible keymap changes.
- For `.conf` changes that alter physical behavior, such as sensor sensitivity, mention hardware verification status.
- For side-specific changes, explain why only that side changed.

## Do Not

- Do not edit `zephyr/` or `.west/` generated/dependency directories.
- Do not push unverified `.overlay` or `.dtsi` changes as "should work".
- Do not change pin numbers unless the hardware wiring change is intentional.
- Do not infer hardware placement from Kconfig flag presence alone.

## Local Environment

- The expected user environment is Windows with PowerShell.
- Use native Windows Git rather than assuming WSL.
- Prefer PowerShell-compatible commands in instructions and examples unless a tool specifically requires another shell.

## Maintenance

When ZMK, `zmk-pmw3610-driver`, keymap-editor, or keymap-drawer usage changes significantly, review this file and update the agent rules if the workflow or assumptions have changed.
