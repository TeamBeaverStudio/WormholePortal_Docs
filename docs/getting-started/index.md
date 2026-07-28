# Getting Started

Build and traverse your first Wormhole Portal pair in 5–10 minutes. By the end,
you will be able to see the destination space through a portal and move a
playable character through it.

## What you'll build

- **Portal rendering:** The destination environment is visible inside the
  portal opening.
- **Character transit:** The player crosses the portal boundary and emerges
  from the linked portal.

<!-- CAPTURE SLOT GS-01: Final portal traversal GIF or short video. -->

## Before you begin

You need:

- Unreal Engine 5.8.
- A Perspective viewport in Game View using SM5 or higher.
- A project with a playable Character Blueprint.
- Wormhole Portal added from Fab, enabled in **Edit > Plugins**, and loaded
  after an editor restart.

!!! note "Use a Character Blueprint"

    This quickstart uses a Character Blueprint with a root Capsule Component,
    Character Movement, and a non-simulating Skeletal Mesh.

## 1. Configure portal tracing

After the plugin starts, a notification appears when the project does not have
the required portal trace channel.

1. Select **Add Automatically** in the notification.
2. The plugin adds `WPPortalTrace` to `Config/DefaultEngine.ini` and aligns the
   plugin setting with the new trace channel.
3. Restart the editor before using portal-aware traces.

<!-- CAPTURE SLOT GS-02: WPPortalTrace startup notification and action. -->

!!! warning "Restart required"

    The trace channel is not reliable until the editor has restarted. If the
    notification returns, confirm the automatic setup completed and restart
    again.

`WPPortalTrace` is used by portal-aware traces. Character transit uses overlap
handling independently, but the channel should still be configured as part of
the project setup.

??? info "Configure WPPortalTrace manually"

    1. Open **Edit > Project Settings > Engine > Collision**.
    2. Add a **Trace Channel** named `WPPortalTrace`.
    3. Set its **Default Response** to **Ignore**.
    4. Open **Project Settings > Plugins > Wormhole Portal**.
    5. Set **Portal Trace Channel** to the Game Trace Channel assigned to
       `WPPortalTrace`.
    6. Restart the editor.

## 2. Create a portal pair

1. Open **Place Actors** and search for `WormholePortalActor`.
2. Place two native `WormholePortalActor` instances at different locations.
3. Select the first portal and set **Linked Portal** to the second portal.

The reciprocal link is created automatically. The first portal's metric values
are also copied to its linked portal, so you do not need to configure the
second portal separately.

<!-- CAPTURE SLOT GS-03: Linked Portal, unit scale, and default metrics. -->

!!! warning "Keep actor scale at one"

    Leave the Transform Scale of both portals at `(1, 1, 1)`. Change the
    portal's physical dimensions with its Metric properties instead of scaling
    the actor.

The default metric is:

| Property | Default | Controls |
| --- | ---: | --- |
| **Portal Radius** | `50 cm` | The radius of the portal opening |
| **Throat Half Length** | `100 cm` | Half of the connected throat length |
| **Transition Length** | `200 cm` | The blend distance into and out of the throat |

## 3. Bake the visual data

For a deterministic quickstart result, bake the DNEG lookup data before
testing.

1. Open the main **Tools** menu.
2. Under **Wormhole Portal**, select **Bake All DNEG LUTs**.
3. In **DNEG LUT Bake Settings**, set **Quality** to **Balanced**.
4. Set **Domain** to **Current Level Auto**.
5. Select **Bake**.
6. Wait for the success notification beginning with `DNEG LUT ready:`.

<!-- CAPTURE SLOT GS-04: Balanced and Current Level Auto bake settings. -->
<!-- CAPTURE SLOT GS-05: DNEG LUT ready success notification. -->

!!! note

    Wormhole Portal has a runtime fallback, but this quickstart bakes the data
    first so every test starts from the same visual state.

## 4. Enable character transit

1. Open the playable Character Blueprint.
2. In the Components panel, select **Add** and add `WPTransitComponent`.
3. Select the new component.
4. Keep **Transit Enabled** selected.
5. Keep **Transit Type** set to **Auto**.
6. **Compile** and **Save** the Blueprint.

<!-- CAPTURE SLOT GS-06: WPTransitComponent with Enabled and Auto visible. -->

!!! tip "Setting up several actors"

    Open **Tools**, then under **Wormhole Portal** select **Transit Manager**
    when you need to inspect or apply transit setup across several actors. A
    status of **Ready** means the actor's setup is compatible; it does not
    replace a runtime transit test.

## 5. Test the portal

Start Play In Editor and approach the first portal with your character.

- **☐ Portal rendering:** Look through the opening and confirm that the
  destination space is visible.
- **☐ Character transit:** Walk across the boundary and confirm that the
  character emerges from the linked portal.

<!-- CAPTURE SLOT GS-07: PIE portal view and successful character exit. -->

!!! success "Quickstart complete"

    When both checks pass, the portal pair is ready for level design and
    gameplay integration.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| The `WPPortalTrace` warning keeps returning | Select **Add Automatically**, confirm the config update completed, and restart the editor. |
| The portal is not visible | Confirm **Linked Portal**, unit actor scale, a Perspective Game View using SM5+, and a completed DNEG LUT bake. |
| The player does not pass through | Confirm `WPTransitComponent`, **Transit Type: Auto**, **Transit Enabled**, and the required Character components. |
| Transit Manager reports `ActorTooLarge` | Increase **Portal Radius**. Do not increase the portal Actor Scale. |
| Transit Manager does not report `Ready` | Select the actor in Transit Manager and resolve the setup item it reports before testing again. |
| The packaged build cannot find baked data | Add `/Game/WormholePortal/Generated/DNEG` to the project's cook directories. |

??? info "Collect additional diagnostics"

    - Filter the **Output Log** for `LogWormhole`.
    - Run `stat WormholePortal` in the console to display runtime statistics.
    - Open **Transit Manager** and check whether the actor reports **Ready**.

## Next steps

Continue with:

- Portal metrics and rendering.
- Transit Manager workflows.
- Material clipping and voxel collision.
- Portal-aware traces, audio, lighting, and World Partition.
- [Features](../features/) for capability guides.
- [Reference](../reference/) for settings and interfaces.
- [Issues](../issues/) for known problems and workarounds.

!!! warning "Cook generated DNEG data"

    Before packaging, add `/Game/WormholePortal/Generated/DNEG` to
    **Project Settings > Packaging > Additional Asset Directories to Cook**, or
    add the following entry to `Config/DefaultGame.ini`:

    ```ini
    [/Script/UnrealEd.ProjectPackagingSettings]
    +DirectoriesToAlwaysCook=(Path="/Game/WormholePortal/Generated/DNEG")
    ```
