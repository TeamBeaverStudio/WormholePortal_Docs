# FAQ

## Which Unreal Engine version does the plugin target?

The current plugin and documentation target Unreal Engine 5.8. Validate another
engine version in that version before production use.

## Does every portal need a linked portal?

A valid pair is required for rendering a destination and for transit, traces,
audio, lighting, and destination streaming. Assigning **Linked Portal** creates
the reciprocal link and synchronizes the pair's metric values.

## Can I resize a portal with Actor Scale?

No. Keep both Portal Actors at `(1, 1, 1)` and use:

- **Portal Radius**
- **Throat Half Length**
- **Transition Length**

Changing Actor Scale can make the visual mesh and collision disagree with the
portal metric, and the renderer rejects unsupported scale.

## Do I have to bake a LUT?

Not while **Allow Runtime LUT Fallback** is enabled. The default configuration
can generate compatible transient data asynchronously when a baked LUT is not
available.

Pre-baking is recommended when predictable startup readiness matters. A portal
with `Transition Length = 0` uses the analytic path and does not need a LUT.

## Can portals appear in Scene Capture, VR, split-screen, or every Movie Render Queue pass?

Not currently. Rendering supports one primary, perspective, non-stereo Game
View.

Scene Capture, Reflection Capture, Planar Reflection, stereo/VR, split-screen,
and other multi-view families are excluded. Movie Render Queue supports the
main deferred mono beauty output; custom passes, Virtual Texture passes,
stereo, and multi-view outputs omit the portal composite.

## Which Actors can use transit?

Add `WPTransitComponent` to opt an Actor into transit. Supported types are:

- `Character`
- `Projectile`
- `Pawn`
- `Physics`
- `Auto`

`Auto` checks Character, Projectile, Pawn, then Physics. Each type still
requires its expected movement, collision, or physics components. Use
**Transit Manager** to find setup problems before running PIE.

## What does ActorTooLarge mean?

The Actor does not fit inside the usable portal opening for that transit.
Increase **Portal Radius**, reduce the Actor's collision bounds, or improve its
collision setup. Do not scale the Portal Actor.

## What is Max Portal Depth?

Portal-aware line traces can cross multiple portals. **Max Portal Depth**
prevents an infinite loop between linked endpoints.

The default is `4`. Increase it only when the intended logical trace genuinely
needs more crossings.

## Which collision channel should a portal-aware trace use?

Use the normal collision channel for the objects you want to hit.

Do not use `WPPortalTrace` as that channel. `WPPortalTrace` is reserved for the
plugin's internal portal-intersection detection.

## Does transit support multiplayer?

Portal movement, link, and metric state are replicated, and the Transit
Component carries server-authoritative replicated transit state.

Participating gameplay Actors still need Unreal's normal replication,
ownership, relevancy, and movement configuration. Test the complete behavior
under the network conditions used by your project.

## Does World Partition work with portals?

Yes. The runtime can request destination-side streaming around a linked portal.
Transit can report `NotReady` while the destination area is still loading.

Tune **Streaming Preload Distance**, **Streaming Release Distance**, and
**Streaming Query Interval** on each Portal Actor. Blueprint code can check
`IsLinkedPortalAreaReady()`.

## Which sounds travel through a portal?

The source must be an active Audio Component with spatialization and
attenuation enabled, and its audible range must reach the portal.

UI/2D sounds, Source Bus assets, multiple-instance components, disabled
sources, sources inside the portal sphere, and generated proxies are excluded.
Portal audio currently supports one primary listener and one portal hop.

## Which Light types are transmitted?

Point and Spot Lights are transmitted. Directional Lights may be collected by
the light-collection subsystem, but the current transmission subsystem does not
create Directional Light routes. Rect Lights are also not transmitted.

See [Portal lighting troubleshooting](../issues/#portal-lighting) for the
remaining limitations.

## Is Material Clip automatic?

No. Enable **Use Material Clip** on the Transit Component and integrate the
supplied transit clip Material Function into the Actor's material.

The material reads four consecutive Custom Primitive Data values beginning at
the configured **Clip Base Index**. The default index is `28`.

## What is the difference between Material Clip and Voxel Collision?

**Material Clip** changes only how a compatible mesh is drawn while it overlaps
the portal boundary. **Voxel Collision** changes how supported Static Mesh
collision is represented on both sides during that crossing.

They are independent. A project can use either, both, or neither.

## Are generated LUT assets included in a packaged build?

The Editor module attempts to add the configured **Generated LUT Asset Path** to
the project's cook directories. Before packaging, confirm the path appears in
the Packaging settings, especially if `Config/DefaultGame.ini` is read-only or
the generated path was customized.

The code default is `/Game/WormholePortal/Generated/LUT`.

## How can I inspect runtime performance?

Run:

```text
stat WormholePortal
```

Use `stat gpu` or ProfileGPU for actual GPU execution cost. For rejection
details, filter **Output Log** by:

```text
LogWormhole
```
