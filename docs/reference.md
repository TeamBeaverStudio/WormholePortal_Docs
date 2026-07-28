# Reference

This page summarizes the public authoring properties, Blueprint nodes, C++
interfaces, settings, and diagnostics provided by Wormhole Portal.

!!! note "Defaults and project overrides"

    Values on this page are plugin code defaults. Values already serialized in
    `Config/DefaultEngine.ini` or console-variable configuration override them
    for that project.

## Portal Actor { #portal-actor }

`AWormholePortalActor` represents one endpoint. Setting **Linked Portal** on
one actor establishes the reciprocal link and copies that actor's metric values
to both endpoints.

!!! warning "Keep portal scale at one"

    Portal metric calculations assume an Actor Scale of `(1, 1, 1)`. Change
    **Portal Radius**, **Throat Half Length**, and **Transition Length** instead
    of scaling the Actor.

<!-- CAPTURE SLOT R-01: Portal Actor Details panel with Linked Portal, unit Transform Scale, all three Metric values, and Active LUT Domain visible. -->

### Authoring properties

| Property | Code default | Constraint and purpose |
| --- | ---: | --- |
| **Linked Portal** | None | Destination endpoint. A portal cannot link to itself. |
| **Portal Radius** (`ρ`) | `50 cm` | Seam and traversal radius; minimum `1 cm`. When `T > 0`, it is constrained by the active LUT domain. |
| **Throat Half Length** (`a`) | `100 cm` | Distance from the seam to the mouth; minimum `0`. |
| **Transition Length** (`T`) | `200 cm` | Distance from the mouth to flat space; minimum `0` and constrained by the active LUT domain. `0` uses the no-transition path. |
| **LUT Asset Override** | None | Optional per-instance replacement for the project LUT catalog. |
| **Streaming Preload Distance** | `15,000 cm` | Begins destination loading in World Partition. |
| **Streaming Release Distance** | `20,000 cm` | Keeps loading active; clamped to at least the preload distance. |
| **Streaming Query Interval** | `0.2 s` | Proximity reevaluation interval; minimum `0.01 s`. |
| **Draw Portal Debug** | On in Editor | Draws seam, mouth, and transition boundaries. Forced off when PIE begins. |

Metric boundaries are:

```text
Mouth Radius      = Portal Radius + Throat Half Length
Transition Radius = Mouth Radius + Transition Length
LUT ratio         = Transition Length / Portal Radius
```

### Blueprint API

| Node | Kind | Purpose |
| --- | --- | --- |
| `Set Linked Portal` | Callable | Creates or replaces the reciprocal link and synchronizes the metric. |
| `Clear Linked Portal` | Callable | Removes the reciprocal link. |
| `Get Linked Portal` / `Has Linked Portal` | Pure | Reads link state. |
| `Is Linked Portal Area Ready` | Pure | Always `true` in a regular level; reports destination streaming readiness in World Partition. |
| `Set Portal Radius` | Callable | Sets `ρ`, applies LUT-domain constraints when `T > 0`, and propagates it. |
| `Set Throat Half Length` | Callable | Sets `a` and propagates it. |
| `Set Transition Length` | Callable | Sets `T`, applies LUT-domain constraints, and propagates it. |
| `Set Metric Parameters` | Callable | Validates and applies all three values atomically. Prefer this when changing several values at runtime. |
| Metric getters | Pure | `Get Portal Radius`, `Get Mouth Radius`, `Get Throat Half Length`, `Get Transition Length`, and `Get Transition Radius`. |
| `Get Portal Cube Render Target` | Pure | Returns a borrowed runtime render target. Do not resize, initialize, update, or release it. |
| `Get LUT Texture` / `Get LUT Z` | Pure | Reads the active volume LUT and the portal's logical slice. |
| `Transform Ray Through Portal` | Callable | Maps an entry point and inward-traveling direction to the linked portal. It does not perform a trace. Default exit offset: `2 cm`. |
| `Set Draw Portal Debug` / `Is Portal Debug Enabled` | Callable / Pure | Controls Editor boundary visualization. |

## Transit Component { #transit-component }

Add `UWPTransitComponent` to an Actor to opt it into portal traversal.

<!-- CAPTURE SLOT R-02: WPTransitComponent Details panel with Transit, Advanced, and Voxel groups expanded. -->

### Properties

| Property | Default | Purpose |
| --- | ---: | --- |
| **Transit Enabled** | On | Allows a portal overlap to start transit. |
| **Transit Type** | `Auto` | Selects a concrete handler or automatic resolution. |
| **Ignore Time** | `0.15 s` | Reentry lockout after a successful commit. |
| **Draw Debug** | Off | Draws active transit geometry. |
| **Use Voxel Collision** | Off | Uses baked voxel collision while the Master and Twin coexist. |
| **Use Material Clip** | Off | Drives compatible materials through Custom Primitive Data. |
| **Voxel Size** | `20 cm` | Requested voxel edge length for the Editor bake. |
| **Max Voxel Count** | `256` | Maximum boxes per Static Mesh; range `1–512`. |
| **Center Mode** | `Root Component Location` | Reference used to select the entry tangent plane. Options: `Root Component Location`, `Actor OBB Center`. |

`Auto` resolves in this order: `Character`, `Projectile`, `Pawn`, then
`Physics`. Selecting a concrete type validates only that type and does not
fall back to another handler.

### Delegates

| Delegate | When it fires |
| --- | --- |
| `On Phase Changed` | The owner's transit phase changes. |
| `On Twin Preparing` | Template duplication is complete, immediately before the Twin Construction Script. Only synchronous work is safe here; do not use latent actions such as `Delay`. |
| `On Twin Created` | Twin creation and run preparation are complete. |
| `On Twin Removing` | Immediately before the Twin is removed. |

### Blueprint API

| Node | Purpose |
| --- | --- |
| `Get Phase` | Returns `Idle`, `Check`, `Crossing`, or `Cooldown`. |
| `Get Transit Role` | Returns `None`, `Master`, or `Twin`. |
| `Get Counter Part Actor` | Returns the opposite Actor in the active relationship. |
| `Get Master Actor` / `Get Twin Actor` | Returns a specific side of the relationship. |
| `Get Source Portal` / `Get Dest Portal` | Returns the entry and destination endpoints. |
| `Get Transit Type` | Returns the concrete type after `Auto` resolution. |
| `Get Transit Sequence` | Returns the World-local identifier for the current transit. |
| `Cancel Transit` | Cancels active transit in an authoritative World. |
| `Get Entry Data` / `Get Exit Data` | Returns the surface point and outward normal. |
| `Map Point`, `Map Direction`, `Map Rotation`, `Map Transform` | Maps values through the current transit. Returns `false` without a valid mapping. |
| `Is Point Inside Portal` | Tests the active entry tangent plane. |
| `Refresh From Owner` | Re-resolves the type and component caches. Allowed only while `Idle`. |

### Transit enums

| Enum | Values |
| --- | --- |
| `EWPTransitType` | `Auto`, `Physics`, `Character`, `Projectile`, `Pawn` |
| `EWPTransitPhase` | `Idle`, `Check`, `Crossing`, `Cooldown` |
| `EWPTransitRole` | `None`, `Master`, `Twin` |
| `EWPTransitResult` | `None`, `Rejected`, `Committed`, `Cancelled` |
| `EWPTransitFailReason` | `None`, `NotReady`, `PortalUnavailable`, `AlreadyInTransit`, `CooldownActive`, `ActorTooLarge`, `TwinCreationFailed`, `PortalDestroyed`, `InternalError`, `UnsupportedActor`, `InvalidSetup`, `TransitDisabled`, `MissingPrimitives`, `MissingPhysicsMesh`, `MissingVoxelData` |

## Portal-aware line traces { #portal-aware-line-traces }

Do not pass the configured `WPPortalTrace` channel as the scene trace channel.
The library uses that channel internally to detect portals.

<!-- CAPTURE SLOT R-03: Blueprint graph connecting Portal Line Trace Detailed By Channel to Break WPPortalTraceResult. -->

| Blueprint node | Result |
| --- | --- |
| `Portal Line Trace By Channel` | Final blocking `Hit Result` and termination status. |
| `Portal Line Trace Detailed By Channel` | `FWPPortalTraceResult` with logical distance and portal events. |
| `Portal Line Trace Multi By Channel` | Overlap hits plus the first blocking hit in logical path order. |
| `Portal Line Trace Multi Detailed By Channel` | Detailed scene hits and portal events across all segments. |

Common defaults are `Ignore Self = true`, `Max Portal Depth = 4`, `Portal Exit
Offset = 2 cm`, `Draw Time = 5 s`, a red trace color, and a green hit color.

`FHitResult.Distance` restarts at each post-portal segment. Use
`FWPPortalTraceHit.LogicalDistance` for distance from the original start.
Logical distance excludes travel inside the portal and **Portal Exit Offset**.

!!! warning "Portal Exit Offset behavior"

    The offset prevents an immediate self-hit. It currently does not consume
    the remaining trace distance, and the gap between the exit surface and the
    offset trace start is not collision-tested.

### Trace result types

| Type | Important fields |
| --- | --- |
| `FWPPortalTraceResult` | `Status`, `bBlockingHit`, `RequestedDistance`, `ProcessedDistance`, `PortalTraversalCount`, `SceneHits`, `PortalEvents` |
| `FWPPortalTraceHit` | `Hit`, `LogicalDistance`, `SegmentIndex` |
| `FWPPortalTracePortalEvent` | `DetectionHit`, `EntryPortal`, `ExitPortal`, `EntryDirection`, `ExitTraceStart`, `ExitDirection`, `LogicalDistance`, `PortalDepth`, `Outcome` |
| `EWPPortalTraceStatus` | `Completed`, `InvalidInput`, `MaxPortalDepthReached`, `PortalTransformFailed` |
| `EWPPortalTracePortalOutcome` | `Traversed`, `MaxDepthReached`, `TransformFailed` |

C++ additionally exposes `PortalLineTraceTestByChannel`,
`PortalLineTraceSingleByChannel`, and `PortalLineTraceMultiByChannel`.

## Project Settings { #project-settings }

Open **Edit > Project Settings > Plugins > Wormhole Portal**. These values are
stored in `DefaultEngine.ini`.

<!-- CAPTURE SLOT R-04: Project Settings > Plugins > Wormhole Portal with the main setting groups visible. -->

### Trace and transit

| Setting | Plugin default |
| --- | ---: |
| **Portal Trace Channel** | `ECC_GameTraceChannel1` |
| **Portal Trace Channel Name** | `WPPortalTrace` |
| **Plane Tie Angle** | `1°` |
| **Plane Priority** | `YZ > XZ > XY` |
| **Clip Base Index** | `28` |
| **Generated Voxel Asset Path** | `/Game/WormholePortal/Generated/Voxels` |

**Clip Base Index** reserves four consecutive Custom Primitive Data values and
must match the material using `MF_WPTransitClip`.

### Dynamic cubemap resolution

| Setting | Plugin default |
| --- | ---: |
| **Hidden / Minimum Resolution** | `64` |
| **Tier 1 Start / Resolution** | `8%` / `256` |
| **Tier 2 Start / Resolution** | `32%` / `512` |
| **Tier 3 Start / Resolution** | `60%` / `768` |
| **Inside SafeProxy Resolution** | `768` |

Resolutions are normalized to multiples of 64 in the `64–2048` range and may
be reduced by the runtime VRAM budget.

### Scene-capture show flags

The plugin code default is On for:

- Lumen Reflections
- Screen Space Ambient Occlusion
- Volumetric Cloud Bundle
- Dynamic Shadows Bundle
- Sky Lighting Bundle
- Sky Atmosphere Bundle
- Deferred Lighting Bundle
- Lighting Master Bundle
- Fog Master Bundle
- Volumetric Fog

These switches affect only managed cube captures, not the player's main view.
**Lighting Master Bundle** and **Fog Master Bundle** are parent switches for
their dependent options.

### Portal audio

| Setting | Plugin default |
| --- | ---: |
| **Enable Portal Audio** | On |
| **Transmission Gain** | `1.0` |
| **Enable Occlusion** | On |
| **Occlusion Channel** | `Visibility` |
| **Occlusion Check Interval** | `0.1 s` |
| **Occluded Volume Multiplier** | `0.35` |
| **Occlusion Low-pass Frequency** | `1200 Hz` |
| **Occlusion Surface Bias** | `2 cm` |
| **Source Reconcile Interval** | `0.25 s` |

### Portal source shadows

| Setting | Plugin default |
| --- | ---: |
| **Enable Portal Source Shadows** | On |
| **Base Resolution** | `256` |
| **Update Rate** | `30 Hz` |
| **Captures Per Frame** | `2` |
| **Active Routes** | `8` |
| **Depth Bias** | `1 cm` |
| **PCF Radius** | `1 texel` |

### LUT

| Setting | Plugin default |
| --- | --- |
| **Generated LUT Asset Path** | `/Game/WormholePortal/Generated/LUT` |
| **Impact / Transition / Ratio Samples** | `512 / 48 / 24` |
| **Integration Steps** | `192` |
| **Transition Ratio Domain** | `0.5–8.0` |
| **Tail Flatten Start** | `0.5` |
| **Allow Runtime LUT Fallback** | On |

## Tags

| Actor or Component tag | Effect |
| --- | --- |
| `Wormhole.Ignore` | Excludes an Actor or Primitive Component from transit resolution. |
| `WP.PortalAudio.Disabled` | Excludes an Audio Component or its owning Actor from portal audio. |
| `WP.PortalLight.Disabled` | Excludes a Light Component or its owning Actor from portal light collection. |

`WP.PortalAudio.Generated`, `WP.PortalLight.Generated`, and
`WormholeGeneratedTransit` are reserved for objects created by the plugin and
should not be assigned manually.

## Editor tools

| Location | Tool |
| --- | --- |
| **Tools > Wormhole Portal > Transit Manager** | Checks Actor compatibility, reports `Ready`, `Needs Setup`, or `Not Supported`, and can add transit to ready Actors. |
| **Tools > Wormhole Portal > Bake All LUTs** | Opens **LUT Bake Settings** and generates the shared Volume LUT and catalog. |
| Transit Component Details | **Bake Voxel Body** generates voxel assets from Static Mesh Simple Collision when **Use Voxel Collision** is enabled. |
| Portal Actor Details | Displays the active LUT domain and constrains metric controls to it. |
| Startup notification | Offers **Add Automatically** or **Open Collision Settings** when `WPPortalTrace` is missing or mismatched. |

LUT quality and domain presets are:

| Preset group | Options |
| --- | --- |
| **Quality** | `Fast (256/24/12/64)`, `Balanced (512/48/24/192)`, `High (768/64/32/384)`, `Cinematic (1024/96/48/768)` |
| **Domain** | `Current Level Auto`, `Standard (0.5–8)`, `Wide (0.25–16)`, `Narrow (1–4)` |

The Quality numbers are Impact Samples, Transition Samples, Ratio Samples, and
Integration Steps.

## Native integration

For a custom C++ module, add `WormholePortalRuntime` to the module
dependencies.

| Type | Scope and public use |
| --- | --- |
| `UWPRegistrySubsystem` | World-scoped portal and pair registry with native registration, change, and pair delegates. |
| `UWPTransitSubsystem` | Server-authoritative transit coordinator and native lifecycle delegates. |
| `UWPPortalStreamingSubsystem` | World Partition destination requests. Normal gameplay reads readiness from the Portal Actor. |
| `UWPPortalAudioSubsystem` | Opposite-side audio routes. Blueprint exposes tracked-source and proxy counts. |
| `UWPPortalLightCollectionSubsystem` | Collects supported Point, Spot, and Directional Lights for C++ snapshots. |
| `UWPPortalLightTransmissionSubsystem` | Generates Point/Spot proxy lights and source-shadow routes. |
| `UWPLUTCacheSubsystem` | Engine-scoped asynchronous baked/fallback LUT cache; completion returns on the Game Thread. |
| `IWPRenderer` | Advanced modular-feature boundary for pair registration and immutable render packets. |

`FWPTransform` provides construction, point/direction/rotation mapping, inverse
mapping, exit mapping, and complete Transform mapping.

## Diagnostics

Run:

```text
stat WormholePortal
```

The group reports CPU setup and submission timing, active pair counts, cubemap
memory and megapixels, capture submissions, LUT requests/cache hits/fallbacks,
render packet counts, and production composite workload. GPU execution remains
in `stat gpu` or ProfileGPU.

Filter **Output Log** by `LogWormhole`. To raise verbosity for the current
session:

```text
Log LogWormhole Verbose
```

### Common rendering CVars

| CVar | Code default | Purpose |
| --- | ---: | --- |
| `wp.RuntimeEnabled` | `1` | Production render-packet pipeline master switch. |
| `wp.SceneViewExtensionEnabled` | `1` | Warmup and production compositing master switch. |
| `wp.SimulateViewEnabled` | `1` | Enables the SIE viewport production pass. |
| `wp.CaptureSchedulerMode` | `2` | `1`: atomic pair; `2`: staggered endpoints. `0` is a deprecated alias of `1`. |
| `wp.CaptureTargetEndpointHz` | `30` | Visible-endpoint update rate; runtime range `5–120 Hz`. |
| `wp.CaptureVisibilityInvisibleHoldSeconds` | `0.5` | Both-invisible time before captures pause. |
| `wp.CaptureOcclusionTraceIntervalSeconds` | `0.1` | CPU SafeProxy occlusion-test interval. |
| `wp.CaptureVRAMBudgetMiB` | `160` | Persistent cubemap color-memory budget; minimum `16 MiB`. |
| `wp.CaptureResolutionUpgradeHoldSeconds` | `0.75` | Delay before increasing resolution. |
| `wp.CaptureResolutionDowngradeHoldSeconds` | `0.15` | Delay before decreasing resolution. |
| `wp.CaptureResolutionMinimumDwellSeconds` | `0.5` | Minimum interval between completed resolution transitions. |
| `wp.CaptureMaxViewDistanceCm` | `-1` | Positive values enable capture distance culling; `<=0` is unlimited. |
| `wp.CaptureLODDistanceFactor` | `1` | Capture LOD multiplier; range `1–10`. |
| `wp.CubeLumenParityMode` | `0` | `0`: no Lumen, `1`: GI, `2`: GI and reflections. |
| `wp.ViewSummaryInterval` | `5` | Aggregate rendering log interval in seconds. |

Use CVars for profiling and controlled overrides. Keep the Project Settings
values as the normal authoring surface.
