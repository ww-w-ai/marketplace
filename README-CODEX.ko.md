# Codex용 ai-native-cowork

[English](./README-CODEX.md) · [한국어](./README-CODEX.ko.md) · [日本語](./README-CODEX.ja.md) · [简体中文](./README-CODEX.zh-CN.md)

> 빠른 코딩 도우미 Codex를, 맥락을 잃지 않는 실행 파트너로 바꾸세요.

Codex는 기능을 빠르게 구현합니다. 어려운 일은 그다음입니다. 계획을 끝까지 지키고, 결과를 검증하고, 결정 이유를 보존하고, 다음 세션이 추측 없이 이어받게 해야 합니다.

**ai-native-cowork는 그 빈자리를 채우는 작업 운영체제입니다.** 스프린트 실행, 단일 기능 PDCA, 세션 복원, AI 협업 커밋, 문서 동기화를 위한 6개 스킬을 제공합니다. 같은 제품이 Claude Code에서도 동작하며, 두 호스트는 동일한 방법론과 완료 기준을 사용합니다.

## 제공 스킬

| 스킬 | 사용 시점 |
|---|---|
| `cowork-sprint` | 여러 기능을 순차·병렬·혼합 스프린트로 계획하고 실행할 때 |
| `pdca-wf` | 하나의 기능을 Research→Plan→Design→Do→Check/Act→Report로 완성할 때 |
| `cowork-insights` | 과거 Codex·Claude Code 세션을 업무 보고서로 만들 때 |
| `cowork-commit` | 코드와 함께 AI 협업의 의사결정 기록을 커밋할 때 |
| `cowork-doc-init` | 기존 프로젝트의 문서 체계를 처음 정리할 때 |
| `cowork-doc-sync` | 구현 완료 후 문서를 실제 코드와 동기화할 때 |

## Codex에 적합한 이유

- 두 호스트가 하나의 lifecycle, gate, artifact, Done 규칙을 공유합니다.
- Codex의 collaboration worker, plan, tool, approval 경계를 그대로 사용합니다.
- 스프린트 상태를 schema로 검증하고 안전한 전이만 허용합니다.
- 의존성과 파일 ownership을 검사해 안전한 병렬 실행만 허용합니다.
- Goal 제어 envelope는 raw audit에는 남기되 사용자 지시·보고서·커밋 로그에서는 제외합니다.
- Claude Code와 Codex가 동일한 6개 canonical skill을 사용합니다.

## ww-w-ai Marketplace에서 설치

```bash
codex plugin marketplace add ww-w-ai/marketplace
codex plugin add ai-native-cowork@ww-w-ai
```

설치 후 새 Codex 스레드를 시작하세요. 새 스레드부터 설치된 스킬과 플러그인 metadata가 로드됩니다.

## 업데이트

```bash
codex plugin marketplace upgrade ww-w-ai
codex plugin add ai-native-cowork@ww-w-ai
```

업데이트 후에도 새 스레드에서 시작하세요.

## 설치 확인

```bash
codex plugin list
```

`ai-native-cowork@ww-w-ai`가 `installed, enabled` 상태인지 확인합니다.

## 사용 예시

```text
cowork-sprint로 이 로드맵을 계획하고 실행해.
이 기능을 PDCA로 구현해.
최근 7일간 Codex 작업을 요약해.
AI 협업 기록과 함께 커밋해.
구현이 끝났으니 문서를 동기화해.
```

## Codex 전용 동작

### Goal과 이어하기

일반 기능 작업은 Goal을 자동 생성하지 않습니다. 기존 Goal을 이어갈 때는 Goal의 thread ID로 정확한 세션을 복원하며, 단순히 최신 transcript를 추측하지 않습니다.

### 병렬 작업

`cowork-sprint`는 의존성과 owned path로 deterministic cluster를 계산합니다. 첫 번째 미완료 cluster만 실행할 수 있고, 병렬 sprint는 ownership이 겹치지 않아야 합니다.

### 승인 경계

플러그인 설치, push, release, migration, 외부 시스템 변경처럼 외부적이거나 되돌리기 어려운 작업은 명시적 승인이 필요합니다.

### 세션 개인정보

보고 엔진은 로컬 transcript를 읽습니다. 요청한 보고서나 커밋에 필요한 메시지만 정규화하며, `cowork-commit`은 git에 기록하기 전에 관련성과 secret을 엄격히 필터링합니다.

## 요구 사항

- 플러그인을 지원하는 Codex
- Git
- TypeScript 세션 보고 엔진용 Bun
- 상태·scheduler·parity 검사용 Python 3

## 로컬 개발

일반 사용자는 공개 Marketplace로 설치합니다. 플러그인 개발자는 로컬 `plugins/ai-native-cowork` checkout을 가리키는 Codex Marketplace를 구성하고, manifest version 또는 cachebuster를 바꾼 뒤 `codex plugin add`로 다시 설치합니다.

Canonical source: [ww-w-ai/ai-native-cowork](https://github.com/ww-w-ai/ai-native-cowork)

Claude Code를 사용한다면 [README.md](./README.md)를 참고하세요.

## 라이선스

MIT
