# 데모

플러그인에는 기능을 직접 실행하고 구현 예를 살펴볼 수 있는 샘플 맵과
`WormholePortalSample` 모듈이 포함되어 있습니다. 새 프로젝트에 적용하기
전 아래 공개 데모를 먼저 실행하세요.

## 포함된 데모 열기

1. Content Browser의 **Settings**에서 **Show Plugin Content**를 켭니다.
2. 다음 맵을 엽니다.

   ```text
   /WormholePortal/Demo/Lv_WormholePortal_Content_Demo
   ```

3. Play In Editor를 실행하고 맵 안의 안내 표지와 순서를 따라갑니다.

Content Browser에는
`WormholePortal Content/Demo/Lv_WormholePortal_Content_Demo`로
표시됩니다.

!!! warning "공개 시작 맵"

    `Lv_WormholePortal_Content_Demo`가 문서와 Fab 배포물의 기준 샘플입니다.
    `Dev_Demo`는 내부 제작·검증용 맵이며 배포되는 공개 작업 흐름에 포함되지
    않습니다. 프로젝트에서 참조하지 마세요.

## 맵에서 확인할 내용

데모는 기능을 단계별로 확인할 수 있도록 구성되어 있습니다.

| 구간 | 확인할 내용 |
| --- | --- |
| Stage 0 | 기본 조작, 안내 링크와 Portal Gun을 이용한 연결된 포털 생성 |
| Stage 1 | Character 및 일반 Actor Transit, 연결과 Metric의 기본 동작 |
| Stage 2 | 긴 Mesh의 부분 통과, Material Clip, Voxel Collision과 고급 Transit 설정 |
| Stage 3 | 포털 인식 Line Trace와 공개 Blueprint/C++ API 사용 예 |
| Stage 4 | 포털을 통한 Spatial Audio와 Point/Spot Light 전달 |

맵의 안내가 특정 기능을 잠그고 있다면 앞 구간의 조건을 먼저 완료하세요.
렌더링만 보지 말고 Actor가 경계에 걸친 상태, 출구에서의 속도와 방향,
Trace의 논리적 Hit 순서도 함께 확인하는 것이 좋습니다.

## 예제 구현 살펴보기

다음 항목은 실제 프로젝트에 통합할 때 특히 유용합니다.

- Portal Actor 쌍의 **Linked Portal** 및 Metric 설정
- Character, Projectile, Pawn, Physics Actor의 `WPTransitComponent` 구성
- `M_VisualClip`과
  `/WormholePortal/Materials/MaterialFunctions/MF_WPTransitClip` 연결 방식
- `BP_LongMesh`, `BP_PhysicsCube`, `BP_ProjectileCube`의 Transit 예제
- `BP_Stage3Starter`와 Stage 3 예제의 Portal-aware Line Trace 사용 방식
- `UWPPortalGunComponent`가 최종 Physical Metric을 먼저 초기화한 뒤
  `SetPortalVisualScale`로 성장 효과를 만드는 방식
- 데모가 참조하는 읽기 전용 Voxel 데이터와 Portal별로 명시적으로 선택할 수
  있는 LUT Asset `/WormholePortal/Generated`

`/WormholePortal/Generated`는 설치된 읽기 전용 Plugin Content입니다. 포함된
데모는 이 경로의 Voxel 데이터를 참조하지만, 이 경로의 LUT Catalog는 Runtime
기본값이 아닙니다. Portal에 **LUT Asset Override**가 없다면 Runtime은 기본적으로
`/Game/WormholePortal/Generated/LUT/DA_WPLUTCatalog`에서 프로젝트 Catalog를
찾습니다. 호환되는 Baked LUT가 없고 **Allow Runtime LUT Fallback**이 켜져 있으면
호환되는 임시 데이터를 비동기로 생성합니다. 새 LUT와 Voxel Bake의 기본 출력은
쓰기 가능한 `/Game/WormholePortal/Generated`이며, Plugin Content를 Bake 출력
경로로 지정하면 안 됩니다.

필요한 속성 및 API 계약은 [레퍼런스](../reference.md)와 함께 확인하세요.

## 입력과 플러그인 의존성

데모는 Enhanced Input 기반입니다. 아래 바인딩은 UE 5.8에서 배포 대상
Mapping Context를 직접 읽어 검증했습니다.

| Mapping Context | Input Action | 키보드 / 마우스 | 게임패드 |
| --- | --- | --- | --- |
| `IMC_Default` | `IA_Jump` | `Space Bar` | Face Button Bottom |
| `IMC_Default` | `IA_Move` | `W`, `A`, `S`, `D`; 방향키 | Left Stick 2D |
| `IMC_Default` | `IA_Look` | — | Right Stick 2D |
| `IMC_MouseLook` | `IA_MouseLook` | Mouse 2D | — |
| `IMC_Weapons` | `IA_SwapWeapon` | Left Shift | Face Button Top |
| `IMC_Weapons` | `IA_Shoot` | Left Mouse Button | Right Trigger Axis; Right Shoulder |
| `IMC_Weapons` | `IA_FirePortalB` | Right Mouse Button | — |
| `IMC_Weapons` | `IA_PortalDir` | Mouse Wheel Axis | — |
| `IMC_Weapons` | `IA_Grab` | Left Shift | — |

리매핑한 경우에는 고정된 Keyboard Layout을 가정하지 말고 맵 안의 안내
UI와 `/WormholePortal/Demo/Input`,
`/WormholePortal/Demo/Variant_Shooter/Input`의 현재 Mapping Context를 최종
기준으로 삼으세요.

샘플의 Shooter/AI 콘텐츠는 `EnhancedInput`, `StateTree`,
`GameplayStateTree` 플러그인을 사용합니다. 이 플러그인은
`WormholePortal.uplugin`에서 활성화됩니다. Runtime API만 사용하는 자체
게임플레이에는 샘플 Shooter 구조를 복사할 필요가 없습니다.

## 샘플 콘텐츠를 안전하게 재사용하기

`WormholePortalSample`과 `/WormholePortal/Demo`는 학습 및 통합 예제입니다.
프로덕션 게임플레이의 필수 계층이 아닙니다.

샘플 모듈에는 `UWPPortalGunComponent`, `UWPGrabComponent`,
`AWPSampleActorSpawner`, `AWPTransitBomb`, `AWPSampleTurret`, `AWPDemoRoom`,
`AWPDemoRoomManager`가 공개 예제로 포함됩니다. 지원되는 Runtime 계약은
각 클래스의 구현과 [연동 예제](../reference.md#integration-examples)를 함께
확인하세요.

1. 필요한 Blueprint 또는 C++ 흐름만 자체 클래스에 적용합니다.
2. 샘플 Asset을 직접 수정해야 한다면 먼저 프로젝트 Content로 복사해
   플러그인 업데이트와 분리합니다.
3. 복사한 Asset의 Plugin Content 참조와 Input Mapping Context를
   Reference Viewer로 확인합니다.
4. 자체 Collision Channel, Replication, Packaging 및 목표 플랫폼에서
   다시 검증합니다.

런타임 C++ 모듈은 `WormholePortalRuntime`에만 의존할 수 있습니다. 샘플
Portal Gun을 직접 사용할 때만 프로젝트 모듈에 `WormholePortalSample`을
추가하세요.

## 데모 문제 해결

| 증상 | 확인할 항목 |
| --- | --- |
| 맵을 찾을 수 없음 | **Show Plugin Content**가 켜져 있는지 확인하고 정확한 `/WormholePortal/Demo/Lv_WormholePortal_Content_Demo` 경로를 사용합니다. |
| 입력이 동작하지 않음 | PIE 창에 포커스를 두고 Enhanced Input과 포함된 Mapping Context가 활성화되었는지 확인합니다. |
| 포털이 검게 보이거나 합성되지 않음 | Win64, DX12, SM6의 Primary Perspective Non-stereo Game View인지 확인합니다. |
| Transit이 거부됨 | `LogWormhole`의 `RuntimeReason`, `ResolveReason`, `FailedComponents`와 Transit Manager 상태를 확인합니다. |
| LUT 준비를 기다림 | **Tools > Wormhole Portal > Bake All LUTs**에서 데모 Metric을 포함하는 LUT를 Bake합니다. |

더 자세한 진단은 [문제 해결](../issues/index.md)을, 설치부터 직접 포털을 만드는
과정은 [시작하기](../getting-started/index.md)를 참고하세요. 공식 지원이 필요하면
[호환성 및 지원](../support/index.md)의 체크리스트와 연락처를 사용하세요.
