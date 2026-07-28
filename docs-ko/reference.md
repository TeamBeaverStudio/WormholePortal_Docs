# 레퍼런스

이 페이지는 Wormhole Portal이 제공하는 주요 속성, Blueprint 노드, C++
인터페이스, 프로젝트 설정 및 진단 기능을 정리합니다.

!!! note "기본값과 프로젝트 오버라이드"

    이 페이지의 값은 플러그인 코드 기본값입니다.
    `Config/DefaultEngine.ini` 또는 Console Variable 설정에 저장된 값이
    있으면 해당 프로젝트 값이 우선합니다.

## Portal Actor { #portal-actor }

`AWormholePortalActor`는 웜홀의 한쪽 끝을 나타냅니다. 한 액터에서
**Linked Portal**을 지정하면 반대 방향 연결이 자동으로 만들어지고, 시작
포털의 Metric 값이 두 끝점에 동기화됩니다.

!!! warning "포털 스케일을 1로 유지"

    Metric 계산은 Actor Scale `(1, 1, 1)`을 전제로 합니다. Actor를
    스케일링하지 말고 **Portal Radius**, **Throat Half Length**,
    **Transition Length**로 크기를 조절하세요.

<!-- CAPTURE SLOT R-01: Linked Portal, 단위 Transform Scale, 세 Metric 값, Active LUT Domain이 보이는 Portal Actor Details 패널. -->

### 주요 속성

| 속성 | 코드 기본값 | 제약 및 역할 |
| --- | ---: | --- |
| **Linked Portal** | 없음 | 목적지 끝점입니다. 자기 자신과 연결할 수 없습니다. |
| **Portal Radius** (`ρ`) | `50 cm` | Seam 및 물리 통과 반지름입니다. 최소 `1 cm`이며 `T > 0`일 때 활성 LUT Domain에 맞게 제한됩니다. |
| **Throat Half Length** (`a`) | `100 cm` | Seam에서 Mouth까지의 거리입니다. 최소 `0`입니다. |
| **Transition Length** (`T`) | `200 cm` | Mouth에서 평탄 공간까지의 거리입니다. 최소 `0`이며 활성 LUT Domain에 맞게 제한됩니다. `0`이면 전이가 없는 경로를 사용합니다. |
| **LUT Asset Override** | 없음 | 프로젝트 LUT Catalog 대신 사용할 인스턴스별 LUT입니다. |
| **Streaming Preload Distance** | `15,000 cm` | World Partition 목적지 로딩을 시작합니다. |
| **Streaming Release Distance** | `20,000 cm` | 로딩을 유지하는 바깥 거리입니다. Preload Distance 이상으로 제한됩니다. |
| **Streaming Query Interval** | `0.2 s` | 근접 수요를 다시 검사하는 간격입니다. 최소 `0.01 s`입니다. |
| **Draw Portal Debug** | Editor에서 켜짐 | Seam, Mouth, Transition 경계를 표시합니다. PIE 시작 시 강제로 꺼집니다. |

Metric 경계는 다음과 같습니다.

```text
Mouth Radius      = Portal Radius + Throat Half Length
Transition Radius = Mouth Radius + Transition Length
LUT 비율          = Transition Length / Portal Radius
```

### Blueprint API

| 노드 | 종류 | 설명 |
| --- | --- | --- |
| `Set Linked Portal` | Callable | 양방향 연결을 만들거나 교체하고 Metric을 동기화합니다. |
| `Clear Linked Portal` | Callable | 양방향 연결을 해제합니다. |
| `Get Linked Portal` / `Has Linked Portal` | Pure | 연결 상태를 읽습니다. |
| `Is Linked Portal Area Ready` | Pure | 일반 레벨에서는 항상 `true`이며, World Partition에서는 목적지 스트리밍 준비 상태를 반환합니다. |
| `Set Portal Radius` | Callable | `ρ`를 설정하고 `T > 0`이면 LUT Domain 제약을 적용한 뒤 연결된 포털에 전달합니다. |
| `Set Throat Half Length` | Callable | `a`를 설정하고 전달합니다. |
| `Set Transition Length` | Callable | `T`를 설정하고 LUT Domain 제약을 적용한 뒤 전달합니다. |
| `Set Metric Parameters` | Callable | 세 값을 한 번에 검증하고 적용합니다. 런타임에서 여러 값을 바꿀 때 권장합니다. |
| Metric Getter | Pure | `Get Portal Radius`, `Get Mouth Radius`, `Get Throat Half Length`, `Get Transition Length`, `Get Transition Radius` |
| `Get Portal Cube Render Target` | Pure | 런타임이 소유한 참조를 반환합니다. 크기 변경, 초기화, 업데이트 또는 해제를 호출하지 마세요. |
| `Get LUT Texture` / `Get LUT Z` | Pure | 활성 Volume LUT와 현재 포털의 논리적 Slice를 반환합니다. |
| `Transform Ray Through Portal` | Callable | 진입 표면점과 안쪽 방향을 연결된 포털 공간으로 변환합니다. Trace는 수행하지 않습니다. 기본 Exit Offset은 `2 cm`입니다. |
| `Set Draw Portal Debug` / `Is Portal Debug Enabled` | Callable / Pure | Editor 경계 표시를 제어합니다. |

## Transit Component { #transit-component }

Actor가 포털을 통과하게 하려면 `UWPTransitComponent`를 추가합니다.

<!-- CAPTURE SLOT R-02: Transit, Advanced, Voxel 그룹을 펼친 WPTransitComponent Details 패널. -->

### 속성

| 속성 | 기본값 | 역할 |
| --- | ---: | --- |
| **Transit Enabled** | 켜짐 | Portal Overlap이 Transit을 시작할 수 있게 합니다. |
| **Transit Type** | `Auto` | 처리 타입을 직접 선택하거나 자동 판별합니다. |
| **Ignore Time** | `0.15 s` | 성공적인 Commit 후 즉시 재진입하는 것을 막습니다. |
| **Draw Debug** | 꺼짐 | 활성 Transit 진단 형상을 표시합니다. |
| **Use Voxel Collision** | 꺼짐 | Master와 Twin이 공존하는 동안 베이크된 복셀 충돌을 사용합니다. |
| **Use Material Clip** | 꺼짐 | Custom Primitive Data를 통해 호환 머티리얼을 제어합니다. |
| **Voxel Size** | `20 cm` | Editor Bake에서 요청할 복셀 한 변의 길이입니다. |
| **Max Voxel Count** | `256` | Static Mesh당 최대 Box 수입니다. 범위는 `1–512`입니다. |
| **Center Mode** | `Root Component Location` | 진입 접평면의 기준입니다. 선택값: `Root Component Location`, `Actor OBB Center`. |

`Auto`의 판별 순서는 `Character`, `Projectile`, `Pawn`, `Physics`입니다.
구체적인 타입을 선택하면 그 타입만 검증하며 다른 Handler로 대체되지
않습니다.

### Delegate

| Delegate | 호출 시점 |
| --- | --- |
| `On Phase Changed` | 소유 Actor의 Transit Phase가 변경될 때 |
| `On Twin Preparing` | Template 복제가 끝난 직후이자 Twin Construction Script 직전. 동기 작업만 안전하며 `Delay` 같은 Latent Action을 사용하면 안 됩니다. |
| `On Twin Created` | Twin 생성과 Run 준비가 완료될 때 |
| `On Twin Removing` | Twin이 제거되기 직전 |

### Blueprint API

| 노드 | 설명 |
| --- | --- |
| `Get Phase` | `Idle`, `Check`, `Crossing`, `Cooldown`을 반환합니다. |
| `Get Transit Role` | `None`, `Master`, `Twin`을 반환합니다. |
| `Get Counter Part Actor` | 현재 관계의 반대편 Actor를 반환합니다. |
| `Get Master Actor` / `Get Twin Actor` | 관계의 특정 Actor를 반환합니다. |
| `Get Source Portal` / `Get Dest Portal` | 진입 및 목적지 포털을 반환합니다. |
| `Get Transit Type` | `Auto` 판별 이후의 실제 타입을 반환합니다. |
| `Get Transit Sequence` | 현재 World 안에서 Transit을 식별하는 번호입니다. |
| `Cancel Transit` | Authority를 가진 World에서 활성 Transit을 취소합니다. |
| `Get Entry Data` / `Get Exit Data` | 표면 위치와 바깥쪽 Normal을 반환합니다. |
| `Map Point`, `Map Direction`, `Map Rotation`, `Map Transform` | 현재 Transit Mapping으로 값을 변환합니다. 유효한 Mapping이 없으면 `false`입니다. |
| `Is Point Inside Portal` | 활성 진입 접평면의 안쪽인지 검사합니다. |
| `Refresh From Owner` | 타입과 컴포넌트 캐시를 다시 판별합니다. `Idle`에서만 가능합니다. |

### Transit Enum

| Enum | 값 |
| --- | --- |
| `EWPTransitType` | `Auto`, `Physics`, `Character`, `Projectile`, `Pawn` |
| `EWPTransitPhase` | `Idle`, `Check`, `Crossing`, `Cooldown` |
| `EWPTransitRole` | `None`, `Master`, `Twin` |
| `EWPTransitResult` | `None`, `Rejected`, `Committed`, `Cancelled` |
| `EWPTransitFailReason` | `None`, `NotReady`, `PortalUnavailable`, `AlreadyInTransit`, `CooldownActive`, `ActorTooLarge`, `TwinCreationFailed`, `PortalDestroyed`, `InternalError`, `UnsupportedActor`, `InvalidSetup`, `TransitDisabled`, `MissingPrimitives`, `MissingPhysicsMesh`, `MissingVoxelData` |

## 포털 인식 Line Trace { #portal-aware-line-traces }

일반 Scene Trace Channel로 `WPPortalTrace`를 전달하지 마세요. 이 채널은
라이브러리가 포털을 찾을 때 내부적으로 사용합니다.

<!-- CAPTURE SLOT R-03: Portal Line Trace Detailed By Channel과 Break WPPortalTraceResult를 연결한 Blueprint 그래프. -->

| Blueprint 노드 | 결과 |
| --- | --- |
| `Portal Line Trace By Channel` | 마지막 Blocking `Hit Result`와 종료 상태 |
| `Portal Line Trace Detailed By Channel` | 논리적 거리와 Portal Event를 포함한 `FWPPortalTraceResult` |
| `Portal Line Trace Multi By Channel` | 논리적 경로 순서의 Overlap Hit와 첫 Blocking Hit |
| `Portal Line Trace Multi Detailed By Channel` | 모든 구간의 상세 Scene Hit와 Portal Event |

공통 기본값은 `Ignore Self = true`, `Max Portal Depth = 4`, `Portal Exit
Offset = 2 cm`, `Draw Time = 5 s`, 빨간 Trace, 초록 Hit입니다.

`FHitResult.Distance`는 포털을 지난 새 구간마다 다시 시작합니다. 최초
시작점 기준 거리는 `FWPPortalTraceHit.LogicalDistance`를 사용하세요.
논리적 거리에는 포털 내부 거리와 **Portal Exit Offset**이 포함되지
않습니다.

!!! warning "Portal Exit Offset 동작"

    Offset은 출구 포털을 즉시 다시 Hit하는 것을 막습니다. 현재 남은 Trace
    거리에서는 차감되지 않으며, 출구 표면과 Offset이 적용된 Trace 시작점
    사이의 구간은 Collision을 검사하지 않습니다.

### Trace 결과 타입

| 타입 | 주요 필드 |
| --- | --- |
| `FWPPortalTraceResult` | `Status`, `bBlockingHit`, `RequestedDistance`, `ProcessedDistance`, `PortalTraversalCount`, `SceneHits`, `PortalEvents` |
| `FWPPortalTraceHit` | `Hit`, `LogicalDistance`, `SegmentIndex` |
| `FWPPortalTracePortalEvent` | `DetectionHit`, `EntryPortal`, `ExitPortal`, `EntryDirection`, `ExitTraceStart`, `ExitDirection`, `LogicalDistance`, `PortalDepth`, `Outcome` |
| `EWPPortalTraceStatus` | `Completed`, `InvalidInput`, `MaxPortalDepthReached`, `PortalTransformFailed` |
| `EWPPortalTracePortalOutcome` | `Traversed`, `MaxDepthReached`, `TransformFailed` |

C++에는 `PortalLineTraceTestByChannel`, `PortalLineTraceSingleByChannel`,
`PortalLineTraceMultiByChannel`도 공개되어 있습니다.

## Project Settings { #project-settings }

**Edit > Project Settings > Plugins > Wormhole Portal**에서 설정합니다. 값은
`DefaultEngine.ini`에 저장됩니다.

<!-- CAPTURE SLOT R-04: 주요 설정 그룹이 보이는 Project Settings > Plugins > Wormhole Portal 화면. -->

### Trace 및 Transit

| 설정 | 플러그인 기본값 |
| --- | ---: |
| **Portal Trace Channel** | `ECC_GameTraceChannel1` |
| **Portal Trace Channel Name** | `WPPortalTrace` |
| **Plane Tie Angle** | `1°` |
| **Plane Priority** | `YZ > XZ > XY` |
| **Clip Base Index** | `28` |
| **Generated Voxel Asset Path** | `/Game/WormholePortal/Generated/Voxels` |

**Clip Base Index**부터 연속된 네 개의 Custom Primitive Data 값을
사용하며, `MF_WPTransitClip`을 사용하는 머티리얼과 같은 값이어야 합니다.

### 동적 Cubemap 해상도

| 설정 | 플러그인 기본값 |
| --- | ---: |
| **Hidden / Minimum Resolution** | `64` |
| **Tier 1 Start / Resolution** | `8%` / `256` |
| **Tier 2 Start / Resolution** | `32%` / `512` |
| **Tier 3 Start / Resolution** | `60%` / `768` |
| **Inside SafeProxy Resolution** | `768` |

해상도는 런타임에서 `64–2048` 사이의 64 배수로 정규화되며, VRAM Budget에
따라 낮아질 수 있습니다.

### Scene Capture Show Flag

플러그인 코드에서는 다음 항목이 기본으로 켜져 있습니다.

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

이 옵션은 관리되는 Cube Capture에만 적용되며 플레이어 Main View에는
적용되지 않습니다. **Lighting Master Bundle**과 **Fog Master Bundle**은
각 하위 옵션의 상위 스위치입니다.

### Portal Audio

| 설정 | 플러그인 기본값 |
| --- | ---: |
| **Enable Portal Audio** | 켜짐 |
| **Transmission Gain** | `1.0` |
| **Enable Occlusion** | 켜짐 |
| **Occlusion Channel** | `Visibility` |
| **Occlusion Check Interval** | `0.1 s` |
| **Occluded Volume Multiplier** | `0.35` |
| **Occlusion Low-pass Frequency** | `1200 Hz` |
| **Occlusion Surface Bias** | `2 cm` |
| **Source Reconcile Interval** | `0.25 s` |

### Portal Source Shadow

| 설정 | 플러그인 기본값 |
| --- | ---: |
| **Enable Portal Source Shadows** | 켜짐 |
| **Base Resolution** | `256` |
| **Update Rate** | `30 Hz` |
| **Captures Per Frame** | `2` |
| **Active Routes** | `8` |
| **Depth Bias** | `1 cm` |
| **PCF Radius** | `1 texel` |

### LUT

| 설정 | 플러그인 기본값 |
| --- | --- |
| **Generated LUT Asset Path** | `/Game/WormholePortal/Generated/LUT` |
| **Impact / Transition / Ratio Samples** | `512 / 48 / 24` |
| **Integration Steps** | `192` |
| **Transition Ratio Domain** | `0.5–8.0` |
| **Tail Flatten Start** | `0.5` |
| **Allow Runtime LUT Fallback** | 켜짐 |

## Tag

| Actor 또는 Component Tag | 효과 |
| --- | --- |
| `Wormhole.Ignore` | Actor 또는 Primitive Component를 Transit 판별에서 제외합니다. |
| `WP.PortalAudio.Disabled` | Audio Component 또는 소유 Actor를 Portal Audio에서 제외합니다. |
| `WP.PortalLight.Disabled` | Light Component 또는 소유 Actor를 Portal Light 수집에서 제외합니다. |

`WP.PortalAudio.Generated`, `WP.PortalLight.Generated`,
`WormholeGeneratedTransit`은 플러그인이 만든 오브젝트를 위한 내부 값이므로
직접 지정하지 마세요.

## Editor 도구

| 위치 | 기능 |
| --- | --- |
| **Tools > Wormhole Portal > Transit Manager** | Actor 호환성을 검사하고 `Ready`, `Needs Setup`, `Not Supported`를 표시하며 준비된 Actor에 Transit을 적용합니다. |
| **Tools > Wormhole Portal > Bake All LUTs** | **LUT Bake Settings**를 열고 공용 Volume LUT와 Catalog를 생성합니다. |
| Transit Component Details | **Use Voxel Collision**이 켜져 있을 때 **Bake Voxel Body**로 Static Mesh Simple Collision을 복셀 에셋으로 만듭니다. |
| Portal Actor Details | 활성 LUT Domain을 표시하고 Metric 입력 범위를 해당 Domain에 맞게 제한합니다. |
| 시작 알림 | `WPPortalTrace`가 없거나 불일치할 때 **Add Automatically** 및 **Open Collision Settings**를 제공합니다. |

LUT의 Quality 및 Domain Preset은 다음과 같습니다.

| Preset 그룹 | 옵션 |
| --- | --- |
| **Quality** | `Fast (256/24/12/64)`, `Balanced (512/48/24/192)`, `High (768/64/32/384)`, `Cinematic (1024/96/48/768)` |
| **Domain** | `Current Level Auto`, `Standard (0.5–8)`, `Wide (0.25–16)`, `Narrow (1–4)` |

Quality 숫자는 차례로 Impact Samples, Transition Samples, Ratio Samples,
Integration Steps입니다.

## Native 연동

사용자 C++ 모듈에서는 `WormholePortalRuntime`을 모듈 의존성에
추가합니다.

| 타입 | 범위와 용도 |
| --- | --- |
| `UWPRegistrySubsystem` | World 단위 포털 및 Pair Registry와 Native 등록·변경·Pair Delegate |
| `UWPTransitSubsystem` | 서버 권한 Transit Coordinator와 Native Lifecycle Delegate |
| `UWPPortalStreamingSubsystem` | World Partition 목적지 요청. 일반 게임플레이는 Portal Actor에서 준비 상태를 읽습니다. |
| `UWPPortalAudioSubsystem` | 반대편 Audio Route를 생성하며 Blueprint에서 추적 Source와 Proxy 수를 읽을 수 있습니다. |
| `UWPPortalLightCollectionSubsystem` | C++ Snapshot을 위해 Point, Spot, Directional Light를 수집합니다. |
| `UWPPortalLightTransmissionSubsystem` | Point/Spot Proxy Light와 Source Shadow Route를 생성합니다. |
| `UWPLUTCacheSubsystem` | Engine 단위 비동기 Baked/Fallback LUT Cache. 완료 처리는 Game Thread로 돌아옵니다. |
| `IWPRenderer` | Pair 등록과 변경 불가능한 Render Packet을 위한 고급 Modular Feature 경계 |

`FWPTransform`은 생성, Point/Direction/Rotation Mapping, 역방향 Mapping,
Exit Mapping, 전체 Transform Mapping을 제공합니다.

## 진단

다음 명령을 실행합니다.

```text
stat WormholePortal
```

CPU 준비와 제출 시간, 활성 Pair, Cubemap 메모리와 Megapixel, Capture 제출,
LUT 요청·Cache Hit·Fallback, Render Packet 수, Composite 작업량을
표시합니다. 실제 GPU 실행 시간은 `stat gpu` 또는 ProfileGPU에서
확인하세요.

**Output Log**를 `LogWormhole`로 필터링합니다. 현재 세션의 로그 상세도를
높이려면 다음을 실행합니다.

```text
Log LogWormhole Verbose
```

### 주요 렌더링 CVar

| CVar | 코드 기본값 | 역할 |
| --- | ---: | --- |
| `wp.RuntimeEnabled` | `1` | Production Render Packet Pipeline의 상위 스위치 |
| `wp.SceneViewExtensionEnabled` | `1` | Warmup 및 Production Composite의 상위 스위치 |
| `wp.SimulateViewEnabled` | `1` | SIE Viewport Production Pass 활성화 |
| `wp.CaptureSchedulerMode` | `2` | `1`: Atomic Pair, `2`: Staggered Endpoint. `0`은 `1`의 Deprecated Alias |
| `wp.CaptureTargetEndpointHz` | `30` | 보이는 Endpoint 갱신 주기. 런타임 범위 `5–120 Hz` |
| `wp.CaptureVisibilityInvisibleHoldSeconds` | `0.5` | 양쪽이 보이지 않은 뒤 Capture를 멈추기까지의 시간 |
| `wp.CaptureOcclusionTraceIntervalSeconds` | `0.1` | CPU SafeProxy Occlusion 검사 주기 |
| `wp.CaptureVRAMBudgetMiB` | `160` | 지속 Cubemap Color Memory Budget. 최소 `16 MiB` |
| `wp.CaptureResolutionUpgradeHoldSeconds` | `0.75` | 해상도를 높이기 전 대기 시간 |
| `wp.CaptureResolutionDowngradeHoldSeconds` | `0.15` | 해상도를 낮추기 전 대기 시간 |
| `wp.CaptureResolutionMinimumDwellSeconds` | `0.5` | 완료된 해상도 전환 사이의 최소 간격 |
| `wp.CaptureMaxViewDistanceCm` | `-1` | 양수이면 Capture 거리 제한, `<=0`이면 제한 없음 |
| `wp.CaptureLODDistanceFactor` | `1` | Capture LOD 배수. 범위 `1–10` |
| `wp.CubeLumenParityMode` | `0` | `0`: Lumen 없음, `1`: GI, `2`: GI 및 Reflection |
| `wp.ViewSummaryInterval` | `5` | 렌더링 집계 로그 주기(초) |

CVar는 프로파일링과 통제된 오버라이드에 사용하세요. 일반적인 제작 설정은
Project Settings를 기준으로 하는 것이 좋습니다.
