# Decisions

## D001: Harness First

Build each tool through the fixed Harness layers before adding product-specific shortcuts.

## D002: Provider Boundary

External tools, local commands, and third-party APIs enter through Providers.

## D003: Project Root Correction

All current project files must live under `D:\codex work\自媒体创作\Data Collection and Background Analysis`. Files in the parent directory are treated as cleanup candidates or migration sources, not as active project context.

## D004: No Canvas Context

This project is a self-media backend management and review workbench. Canvas-workbench context belongs to `D:\codex work\desk work` and must not drive requirements here.

## D005: Spec Before Build

Major changes require an aligned spec, task board entry, acceptance command, and handoff path before code changes.
