# Issues

This page lists current limitations and the first checks to perform when
Wormhole Portal does not behave as expected.

!!! info "Current compatibility target"

    The current plugin and documentation target Unreal Engine 5.8.

## Known limitations

| Area | Current limitation |
| --- | --- |
| Rendering views | Portal compositing supports a single primary, perspective, non-stereo Game View at SM5 or higher. |
| Unsupported views | Scene Capture, Reflection Capture, Planar Reflection, orthographic, stereo/VR, split-screen, and other multi-view families do not composite the portal. |
| Movie Render Queue | The main deferred mono beauty output is supported. Custom passes, Virtual Texture passes, stereo, and multi-view outputs omit the portal composite. |
| Portal scale | Both linked Portal Actors must use Actor Scale `(1, 1, 1)`. Change the metric properties instead. |
| Transit primitives | Transit requires supported, movable, collision-enabled Primitive Components. Instanced Static Mesh Components are not supported as transit primitives. |
| Physics transit | Physics transit requires at least one usable Primitive and a simulating Static Mesh. |
| Voxel collision | Voxel baking supports Sphere, Box, Capsule, and Convex Simple Collision. |
| Portal traces | The public Blueprint API provides Line Trace By Channel operations. Object Type, Profile, and Sweep variants are not implemented. |
| Ray transform | `Transform Ray Through Portal` accepts a ray approaching the portal from outside toward its interior. |
| Trace exit offset | **Portal Exit Offset** avoids an immediate self-hit, but does not consume remaining trace distance. The gap from the exit surface to the offset start is not collision-tested. |
| Audio | Portal audio currently supports one primary listener, one portal hop, and eligible active spatialized 3D Audio Components. |
| Lighting | Only Point and Spot Lights are transmitted. Directional Lights may be collected internally but are not transmitted. |

## The portal is not visible

Check the following in order:

1. Confirm the Portal Actor has a valid **Linked Portal**.
2. Confirm both portals use Actor Scale `(1, 1, 1)`.
3. Use a Perspective Game View at SM5 or higher.
4. Make sure this is the primary mono view, not a Scene Capture, reflection,
   stereo, or split-screen view.
5. If **Transition Length** is greater than zero, wait for the asynchronous
   runtime LUT fallback or bake a compatible LUT.
6. Filter **Output Log** by `LogWormhole` and inspect any `Reason=` value.

Typical renderer reasons include:

- `InvalidPairOrTransform`
- `MetricInvalid`
- `MetricMismatch`
- `UnsupportedScale`
- `CaptureNotSubmitted`
- `MissingTextureReference`
- `UnresolvedReferencedTexture`
- `WrongTextureDimension`

Unsupported-view reasons include:

- `SceneCaptureOrReflection`
- `UnsupportedGameProjectionOrFeatureLevel`
- `StereoView`
- `NotExactlyOneFamilyView`
- `NonPrimaryPlayerView`

## The WPPortalTrace warning keeps appearing

Wormhole Portal requires a dedicated Trace Channel named `WPPortalTrace`.

Use **Add Automatically** in the startup notification when possible, then
restart the Editor.

<!-- CAPTURE SLOT I-01: WPPortalTrace startup notification with Add Automatically and Open Collision Settings visible. -->

If automatic setup fails:

| Problem | Resolution |
| --- | --- |
| Wrong channel type | Make sure `WPPortalTrace` is a **Trace Channel**, not an Object Channel. |
| Channel mismatch | Align **Portal Trace Channel** in the plugin settings with the channel assigned by Unreal. |
| No free game channel | Free an unused game trace channel before retrying. |
| Read-only configuration | Check out or make `Config/DefaultEngine.ini` writable. |
| Manual setup | In **Project Settings > Engine > Collision**, create `WPPortalTrace` with **Default Response: Ignore**, then align the plugin setting. |

Do not pass `WPPortalTrace` as the ordinary collision channel for a
portal-aware trace. It is reserved for the plugin's internal portal detection.

## LUT baking fails

Open **Tools > Wormhole Portal > Bake All LUTs**, then check:

- an Editor World and at least one Portal Actor exist;
- **Generated LUT Asset Path** is a valid `/Game/...` content path;
- portal metric values are valid;
- the requested `Transition Length / Portal Radius` range is inside the LUT
  domain;
- source control allows generated packages to be checked out and saved;
- the bake was not cancelled.

The default generated path is:

```text
/Game/WormholePortal/Generated/LUT
```

A successful notification begins with:

```text
LUT ready:
```

A baked LUT is optional while **Allow Runtime LUT Fallback** is enabled, but
baking is recommended when predictable startup readiness matters.
`Transition Length = 0` uses the analytic path and does not require a LUT.

## The LUT works in Editor but not in a packaged build

The Editor module attempts to synchronize **Generated LUT Asset Path** with
`DirectoriesToAlwaysCook`.

If the plugin reports that `Config/DefaultGame.ini` could not be updated:

1. Check out the file or make it writable.
2. Restart the Editor so startup synchronization runs again, or add the path
   manually in the project Packaging settings.
3. Confirm the configured path appears in
   **Additional Asset Directories to Cook**.

For the default path, the configuration is equivalent to:

```ini
[/Script/UnrealEd.ProjectPackagingSettings]
+DirectoriesToAlwaysCook=(Path="/Game/WormholePortal/Generated/LUT")
```

If you changed **Generated LUT Asset Path**, use that custom `/Game/...` path.

## Transit does not start

Open **Tools > Wormhole Portal > Transit Manager** and inspect the Actor
status.

<!-- CAPTURE SLOT I-02: Transit Manager with Ready, Needs Setup, and Not Supported examples visible. -->

| Status | What to check |
| --- | --- |
| `Not Supported` | The Actor does not match Character, Projectile, Pawn, or Physics requirements. |
| `Needs Setup: Transit is disabled` | Enable **Transit Enabled** on its `WPTransitComponent`. |
| `Needs Setup: Transit settings are invalid` | Review the selected Transit Type and component setup. |
| `Needs Setup: No movable collision Primitive was found` | Add an owner-controlled, movable, collision-enabled Primitive Component. |
| `Needs Setup: No simulated Static Mesh was found` | Physics transit requires a Static Mesh Component with physics simulation enabled. |
| `Needs Setup: Bake Voxel Body for the Static Mesh` | Enable voxel collision and bake compatible voxel data. |

Runtime rejection logs use the form:

```text
[Transit][Rejected] ... Reason=...
```

Possible reasons include `NotReady`, `PortalUnavailable`,
`AlreadyInTransit`, `CooldownActive`, `ActorTooLarge`, `UnsupportedActor`,
`InvalidSetup`, `TransitDisabled`, `MissingPrimitives`,
`MissingPhysicsMesh`, and `MissingVoxelData`.

With World Partition, `NotReady` can mean the linked area has not finished
streaming. Keep the Actor outside the boundary until
`IsLinkedPortalAreaReady()` returns `true`.

## Voxel Body baking fails

Verify that:

1. **Use Voxel Collision** is enabled on `WPTransitComponent`.
2. The source Static Mesh asset is saved.
3. The mesh has Simple Collision.
4. Collision uses Sphere, Box, Capsule, or Convex shapes.
5. **Voxel Size** is greater than zero.
6. **Max Voxel Count** is between `1` and `512`.

Tapered capsules, level sets, skinned triangle collision, and other unsupported
collision types cannot be baked by the current voxel baker.

## Material clipping does not work

Material clipping is optional and does not modify arbitrary materials
automatically.

Check that:

- **Use Material Clip** is enabled on the Transit Component;
- the material uses the Wormhole Portal transit clip material function;
- the material and Project Settings use the same **Clip Base Index**;
- four consecutive Custom Primitive Data slots beginning at that index are
  available.

The default **Clip Base Index** is `28`.

## Portal audio is not heard

Portal audio needs an eligible, active 3D Audio Component.

Check that:

- spatialization is enabled;
- the component has attenuation settings with spatialization enabled;
- the sound is not a UI/2D sound or a Source Bus asset;
- the component is registered, playing, and not configured for multiple
  simultaneous instances;
- its attenuation range reaches the portal;
- the source is outside the portal sphere;
- neither the component nor its owner has the `WP.PortalAudio.Disabled` tag.

When runtime conditions allow it, `PlayWhenSilent` sources can use an internal
post-effect Source Bus route. Other eligible sources, and cases where that
route is unavailable, use a best-effort separate playback instance. Generated
proxies are excluded from retransmission, so audio currently travels through
one portal hop.

## Portal lighting is not visible { #portal-lighting }

Only Point and Spot Lights are transmitted through the current proxy-light
path.

Check that:

- the source is a Point or Spot Light;
- it is enabled, affects the World, and has non-zero intensity;
- its attenuation volume reaches the entry portal;
- it is not located inside the portal;
- both portals use unit scale and matching radii;
- neither the Light Component nor its owner has the
  `WP.PortalLight.Disabled` tag.

For transmitted source shadows, also confirm **Enable Portal Source Shadows**,
**Cast Shadows**, and **Cast Dynamic Shadows** are enabled. Directional Lights,
Rect Lights, asymmetric radii, lights inside a portal, GI, reflections,
volumetrics, translucent shadows, and colored shadows are not transmitted.

## Diagnostics to collect

Before reporting a problem, collect:

- Unreal Engine version;
- plugin version or commit;
- whether the problem occurs in PIE, SIE, Standalone, packaged output, or
  Movie Render Queue;
- the smallest reproduction steps;
- Output Log entries filtered by `LogWormhole`;
- any `Reason=` value;
- a screenshot of the Portal Actor and relevant component settings;
- `stat WormholePortal` output for rendering or capture problems.

<!-- CAPTURE SLOT I-03: Output Log filtered by LogWormhole with one complete Reason= rejection line visible. -->
