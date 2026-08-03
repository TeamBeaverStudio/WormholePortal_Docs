# Features

Wormhole Portal combines a physically inspired spherical portal renderer with
gameplay systems for transit, traces, audio, light, and World Partition. These
systems use the same linked-pair and metric model, so the rendered view and the
gameplay route lead to the same destination.

## Volumetric wormhole rendering

The portal is rendered as a volume rather than a flat window. Its opening,
throat, and transition region bend the destination view into a continuous
spherical image.

- **Volumetric throat:** the camera can approach and enter the portal volume.
- **Spatial lensing:** rays bend through the configured wormhole metric.
- **Continuous destination view:** the linked space remains visible across the
  opening and throat.
- **Shared LUT rendering:** baked lookup data accelerates ray mapping. When
  enabled, the runtime fallback can generate compatible transient data
  asynchronously.
- **Adaptive captures:** cubemap resolution follows visibility and on-screen
  size, with a separate resolution inside the safe proxy.

Scene-capture show flags in **Project Settings > Plugins > Wormhole Portal**
affect managed portal cube captures only. They do not change the player's main
view.

## Linked pairs and metric controls

Each `WormholePortalActor` links to one other portal. Assigning **Linked
Portal** creates the reciprocal link and synchronizes the metric across the
pair.

| Property | Meaning |
| --- | --- |
| **Portal Radius** (`ρ`) | Radius of the central seam and physical traversal gate |
| **Throat Half Length** (`a`) | Half of the connected throat length |
| **Transition Length** (`T`) | Blend distance between ordinary space and the throat |

The mouth radius is `ρ + a`; the transition radius is `ρ + a + T`.

Keep each Portal Actor's Transform Scale at `(1, 1, 1)`. Author the base metric
with the three properties before BeginPlay. At runtime, initialize all three
physical values atomically with **Initialize Physical Metric**. A later
initialization is accepted only when it preserves the initialized `a/ρ` and
`T/ρ` ratios.

Choose the runtime scale control by intent:

- **Set Uniform Physical Metric Scale** uniformly resizes the physical metric,
  collision, bounds, LUT selection, and capture resolution. It is an expensive
  physical change.
- **Set Portal Visual Scale** changes only the rendered size. It is the
  recommended control for per-frame growth and does not change collision,
  metric values, bounds, LUT identity, capture ownership/warmup/cadence, or
  dynamic resolution.

## Actor transit

Add `WPTransitComponent` to an Actor that must cross a portal. **Transit Type:
Auto** resolves a compatible strategy in this order: Character, Projectile,
Pawn, then Physics.

Every participating Actor needs actor-owned, Movable, collision-enabled
Primitive Components that match its transit handler. Physics transit also
requires at least one supported body with Physics collision enabled and
simulation running. That body must be either:

- a non-instanced `StaticMeshComponent` with a valid Static Mesh; or
- a `BoxComponent`, `SphereComponent`, `CapsuleComponent`, or other supported
  `ShapeComponent`.

`InstancedStaticMeshComponent` is not supported as a transit primitive.

During a crossing, the system maintains the Master/Twin relationship, maps
transform and movement through the linked endpoints, and applies a short
cooldown to prevent an immediate reverse transit. Portal link, metric,
movement, and transit relationship state are replicated; validate the complete
behavior under the replication and relevancy model used by your project.

### Material Clip and Voxel Collision

- **Material Clip** writes clip center, normal, and radius into four consecutive
  Custom Primitive Data slots. A compatible material function uses those values
  to hide the portion crossing the boundary.
- **Voxel Collision** replaces participating collision with baked box voxels
  while the Master and Twin coexist.

Voxel baking supports non-instanced Static Mesh Components with usable Simple
Collision and Box, Sphere, and Capsule Components. Supported Static Mesh
Simple Collision elements are Sphere, Box, Capsule, and Convex. **Max Voxel
Count** applies independently to each baked Primitive, not to an entire Actor or
Static Mesh asset collection.

Enable **Use Voxel Collision**, then select **Bake Voxel Body** in the Transit
Component's Details panel.

## Portal-aware traces

Standard Unreal line traces do not continue through linked portal space. The
portal-aware library detects portals on the reserved `WPPortalTrace` channel
and resumes the logical ray from the linked exit.

Blueprint and C++ APIs provide:

- single-hit and multi-hit line traces;
- compact and detailed results;
- logical distance across every scene segment; and
- traversal counts with per-portal entry/exit events.

The project must contain a Trace Channel named `WPPortalTrace`. The startup
notification can add and align it; restart the Editor after the change. Pass
the ordinary collision channel for the scene objects you want to hit—never pass
`WPPortalTrace` as the trace's scene channel.

## Spatial audio through portals

The audio subsystem discovers eligible spatialized Audio Components and creates
a re-radiated proxy on the other side of a linked pair.

- Routes are evaluated independently in both directions.
- Source-to-entry and exit-to-listener occlusion are tested separately.
- Blocked routes can reduce volume and apply a low-pass filter.
- Runtime-created spatialized Audio Components are periodically discovered.

The current model supports one primary listener and one portal hop. Add the
`WP.PortalAudio.Disabled` tag to an Audio Component or its owner to exclude it.

## Point and Spot light transmission

Point and Spot Lights that affect an entry endpoint can produce a synchronized
proxy at the linked exit. The proxy follows source transform and light
properties, restricts illumination to the aperture, and can transmit
source-side visibility for shadows.

Directional and Rect Lights are not transmitted. Neither are Global
Illumination, reflections, volumetrics, translucent or colored shadows, lights
inside a portal, or pairs with asymmetric radii. See
[Issues](../issues/index.md#portal-lighting) before designing a lighting-dependent
scene.

## World Partition destination streaming

In a World Partition level, each portal can keep the linked destination area
loaded before the player reaches the opening.

- **Streaming Preload Distance** starts the destination request.
- **Streaming Release Distance** controls when it may be released.
- **Streaming Query Interval** controls proximity reevaluation.
- `IsLinkedPortalAreaReady()` exposes destination readiness to gameplay.

Keep release distance greater than preload distance to avoid rapid load/unload
changes. Transit can be rejected as `NotReady` until the linked area is ready.

## Editor workflow and diagnostics

| Tool | Purpose |
| --- | --- |
| **Tools > Wormhole Portal > Transit Manager** | Scan Actors, report exact setup problems, and add transit to compatible Actors |
| **Tools > Wormhole Portal > Bake All LUTs** | Build the shared rendering LUT catalog for portals in the current level |
| Transit Component **Bake Voxel Body** | Bake collision data for each supported participating Primitive |

Portal Actors can draw metric boundaries in the Editor, and Transit Components
can draw active traversal geometry. For broader diagnostics:

- filter **Output Log** by `LogWormhole`;
- enter `Log LogWormhole Verbose` before reproducing a transit rejection in a
  non-Shipping build;
- run `stat WormholePortal` for plugin counters and CPU timings; and
- use `stat gpu` or ProfileGPU for GPU execution cost.

## Where to go next

- Build a pair in [Getting Started](../getting-started/index.md).
- Explore the included scenarios in [Demo](../demo/index.md).
- Look up exact defaults and integration examples in
  [Reference](../reference.md).
- Diagnose limitations in [Issues](../issues/index.md).
