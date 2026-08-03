---
template: home.html
title: 홈
description: Unreal Engine용 Wormhole Portal 플러그인 소개.
hide:
  - toc
---

<div id="introduction" class="wp-introduction" markdown>

<span class="wp-introduction__eyebrow">WORMHOLE PORTAL 1.0</span>

## 연결된 공간, 하나로 이어지는 세계.

Wormhole Portal은 서로 연결된 공간을 같은 세계의 일부처럼 보이고
작동하도록 구성하는 Unreal Engine 5.8 플러그인입니다. 물리 법칙에서
영감을 받은 렌더링 경로는 설정 가능한 목과 전이장을 통과하는 시야를
휘어, 평평한 창과는 다른 입체적인 목적지 화면을 만듭니다.

포털 인식 시스템은 렌더링을 넘어 연결을 유지하며, 경계를 가로지르는
이동, 공간 쿼리, 월드 스트리밍, 공간 오디오 및 Point/Spot Light 전달을
지원합니다.

</div>

## 여기서 시작하세요

- [시작하기](getting-started/index.md)에서 5~10분 안에 연결되고 통과 가능한 포털
  쌍을 만듭니다.
- [데모](demo/index.md)에서 포함된 샘플 맵을 열고 주요 예제를 확인합니다.
- [기능](features/index.md)에서 렌더링과 게임플레이 시스템을 살펴봅니다.
- [레퍼런스](reference.md)에서 속성, Blueprint 노드, C++ 진입점, 설정,
  기본값과 진단 명령을 찾습니다.
- [문제 해결](issues/index.md)에서 현재 제한사항과 해결 절차를 확인합니다.
- [자주 묻는 질문](faq/index.md)에서 제작 단계의 일반적인 질문에 답합니다.
- [호환성, 릴리스 및 지원](support/index.md)에서 지원 환경, 릴리스 정보와 문의
  방법을 확인합니다.

## 호환성 요약

버전 1.0의 공식 테스트·지원 환경은 **Unreal Engine 5.8, Win64, DX12,
SM6**입니다. 포털 합성은 하나의 Primary Perspective Non-stereo Game
View를 대상으로 하며, Renderer 모듈은 Server Target에서 제외됩니다.
Linux, macOS, DX11, 모바일, 콘솔 및 Dedicated Server는 현재 지원 대상으로
선언하지 않습니다. 게시자는 **Team Beaver Studio**이며 공식 지원 연락처는
[beavergametech@gmail.com](mailto:beavergametech@gmail.com)입니다. 자세한
범위는 [호환성 및 지원](support/index.md)을 확인하세요.

!!! tip "포함된 맵으로 평가하기"

    Content Browser에서 **Show Plugin Content**를 켜고
    `WormholePortal Content/Demo/Lv_WormholePortal_Content_Demo`를 연 뒤
    Play In Editor를 실행하세요. [데모 가이드](demo/index.md)에서 확인할 예제와
    샘플 재사용 시 주의할 점을 안내합니다.
