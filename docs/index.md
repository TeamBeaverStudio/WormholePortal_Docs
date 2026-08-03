---
template: home.html
title: Home
description: Documentation for the Wormhole Portal plugin for Unreal Engine.
hide:
  - toc
---

<div id="introduction" class="wp-introduction" markdown>

<span class="wp-introduction__eyebrow">WORMHOLE PORTAL 1.0</span>

## Linked spaces, one continuous world.

Wormhole Portal is an Unreal Engine 5.8 plugin for connected spaces that look
and behave as parts of the same world. Its physically inspired renderer bends
the destination view through a configurable throat and transition field rather
than treating the portal as a flat window.

Portal-aware transit, traces, World Partition streaming, spatial audio, and
Point/Spot light transmission extend the connection beyond rendering.

</div>

## Start here

- [Getting Started](getting-started/index.md) builds a linked, traversable pair in
  5–10 minutes.
- [Demo](demo/index.md) opens the included sample map and identifies the examples worth
  inspecting.
- [Features](features/index.md) explains the rendering and gameplay systems.
- [Reference](reference.md) lists public properties, Blueprint nodes, C++ entry
  points, settings, defaults, and diagnostics.
- [Issues](issues/index.md) covers current limitations and troubleshooting.
- [FAQ](faq/index.md) answers common production questions.
- [Compatibility, Releases, and Support](support/index.md) records the supported target,
  release notes, upgrade checklist, and information to include with a report.

## Compatibility at a glance

Version 1.0 is officially tested and supported with **Unreal Engine 5.8 on
Win64, DirectX 12, and SM6**. Portal compositing requires one primary,
perspective, non-stereo Game View. Linux, macOS, DirectX 11, mobile, consoles,
and dedicated-server targets are not declared supported; the renderer is
excluded from Server targets. See [Compatibility and Support](support/index.md) before
adopting another environment. Wormhole Portal is published by **Team Beaver
Studio**; the official support contact is
[beavergametech@gmail.com](mailto:beavergametech@gmail.com).

!!! tip "Evaluate with the included map"

    Enable **Show Plugin Content**, open
    `WormholePortal Content/Demo/Lv_WormholePortal_Content_Demo`, and run Play
    In Editor in the supported Win64 DX12 SM6 environment. The
    [Demo guide](demo/index.md) explains what to inspect and how to reuse the sample
    responsibly.
