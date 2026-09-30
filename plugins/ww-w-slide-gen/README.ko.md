# ww-w Slide Gen

[English](README.md) | 한국어

**덱에서 할 말을 Claude나 Codex에게 알려 주면, 그대로 발표하고 브라우저에서 바로 고치고 PDF로
인쇄할 수 있는 `deck.html` 한 파일을 돌려받습니다. 한 장에 주장 하나, 브랜드는 디자인 토큰,
그림은 생성하되 글자는 전부 편집 가능한 HTML로 남깁니다.** ww-w Slide Gen은 Claude Code·Codex
플러그인과 그 바탕이 되는 슬라이드 엔진입니다. 엔진은 npm 의존성이 하나도 없고, Node 20에서
샘플 6장을 0.06초에 빌드하며, 폰트와 이미지를 HTML 파일 하나에 모두 담습니다.

## 사용

먼저 설치하세요([설치](#설치)). 그다음 평소 말로 덱을 요청합니다.

```
이 메모로 10장짜리 피치덱 만들어줘. 브랜드는 Acme, 네이비와 오렌지.
```

스킬(`/ww-w-slide-gen`)은 "IR 덱 만들어줘", "이 제안서를 회사소개서로 바꿔줘" 같은 요청에도
시작됩니다. 순서는 이렇습니다.

1. 장마다 주장·근거·레이아웃을 적은 번호 목차를 만들어 보여 줍니다.
2. 템플릿으로 새 덱 폴더를 만듭니다([`scripts/new-deck.js`](scripts/new-deck.js)).
3. `deck.config.json`과 `html/theme.css`에 브랜드를 넣습니다.
4. 샘플 레이아웃 6종에서 출발해 장마다 HTML 페이지를 씁니다.
5. 그림이 필요한 장에만 이미지를 만들고, 그림에는 글자를 넣지 않습니다.
6. `deck.html`을 빌드하고, 모든 장을 직접 보고, 고치고 다시 빌드합니다.
7. 덱 경로, 장 목록, 아직 확인하지 못한 내용을 보고합니다.

단계와 단계별 통과 조건은 [`skills/ww-w-slide-gen/SKILL.md`](skills/ww-w-slide-gen/SKILL.md)에 있습니다.

## 왜 만들었나

저희는 피치덱·제품 소개서·제안서를 직접 만드는데, 매번 같은 세 가지에서 막혔습니다.

1. **생성한 슬라이드는 고칠 수 없습니다.** 이미지 모델이 그럴듯한 장표를 그려 주지만 글자가
   픽셀이라, 오타 하나를 고치려면 그 장을 다시 생성해야 합니다.
2. **덱마다 디자인을 새로 시작합니다.** 색·여백·제목 크기를 이어 줄 장치가 없어 덱마다
   조금씩 달라집니다.
3. **편집 도구가 파일을 가둡니다.** 덱이 앱 안에 있어서 에이전트가 읽고, 비교하고, 다시
   빌드할 수 있는 파일이 아닙니다.

그래서 엔진을 평범한 파일 위에 만들었습니다. 슬라이드는 HTML 페이지, 브랜드는 CSS 토큰이고,
빌드하면 어디서나 열리는 HTML 파일 하나가 나옵니다.

## 핵심 기능

1. [그림과 글자를 나눕니다](#1-그림과-글자를-나눕니다): 그림은 이미지, 글자는 전부 HTML.
2. [브랜드는 토큰 묶음입니다](#2-브랜드는-토큰-묶음입니다): 파일 하나를 고치면 모든 장이 따라옵니다.
3. [브라우저에서 고칩니다](#3-브라우저에서-고칩니다): 글자·위치·크기·장 순서를 앱 없이.
4. [결과는 파일 하나](#4-결과는-파일-하나): 폰트와 이미지를 담아 발표·공유·PDF 인쇄.
5. [영어·한국어 편집기](#5-영어한국어-편집기): 편집기가 브라우저 언어를 따라갑니다.

### 1. 그림과 글자를 나눕니다

스킬은 장 전체를 설계해 시안을 생성하고, 그림은 남기고 글자만 지운 뒤, 같은 자리에 편집
가능한 HTML 글자를 올립니다. 실제 제품 화면은 원본 캡처를 쓰고 생성하지 않습니다. Codex에서는
내장 `image_gen`을 쓰고, Claude Code에서는 Codex CLI가 설치돼 있으면 같은 작업을 Codex에
맡기며, 없으면 가진 이미지 도구를 씁니다. 빌드 자체는 이미지 API를 부르지 않습니다.
([`docs/image-workflow.ko.md`](docs/image-workflow.ko.md), 예시: [`html/pages/06-artwork.html`](html/pages/06-artwork.html))

### 2. 브랜드는 토큰 묶음입니다

색·글꼴·간격·면은 [`html/theme.css`](html/theme.css)에 있습니다. 컴포넌트와 페이지 레이아웃은
토큰만 읽습니다. `theme.css` 뒤에 [`html/themes/cobalt.css`](html/themes/cobalt.css)를 추가하면
같은 슬라이드에서 두 번째 디자인 방향을 볼 수 있습니다. 브랜드를 처음부터 정하려면
[디자인 시스템 가이드](docs/design-system-guide.ko.md)를 따르세요.

### 3. 브라우저에서 고칩니다

덱을 열고 **E**를 누르면 편집 모드입니다. 글자를 눌러 고치고, 끌어서 옮기고, 모서리를 당겨
크기를 바꿉니다. **G**는 묶기, **D**는 복제, **L**은 레이아웃 가이드, **X**는 남은 글자를 단색으로
덮기, **M**은 장 순서 바꾸기입니다. 편집 내용은 덱마다 다른 `storageKey`로 브라우저에 저장돼
덱끼리 섞이지 않습니다. 전체 단축키는 **?**로 봅니다.

### 4. 결과는 파일 하나

[`scripts/build-deck.js`](scripts/build-deck.js)는 `deck.config.json`을 읽고, 스타일·폰트·이미지를
전부 data URL로 넣어 `html/deck.html`을 만듭니다. 테스트가 결과물에 외부 스타일·이미지 참조가
없는지, 폴더를 옮겨도 원래 경로 없이 빌드되는지 확인합니다([`tests/build.test.js`](tests/build.test.js)).
PDF는 브라우저에서 인쇄해 만듭니다.

### 5. 영어·한국어 편집기

편집기 화면 문구 65개가 영어·한국어 두 벌로 한 표에 있습니다. `"uiLang": "auto"`면 브라우저
언어가 한국어일 때 한국어, 그 밖에는 영어로 나옵니다. `"en"`이나 `"ko"`로 고정할 수도 있습니다.
두 벌이 어긋나면 테스트가 실패합니다([`tests/i18n.test.js`](tests/i18n.test.js)).

## 함께 들어 있는 것

- **샘플 레이아웃 6종**: 표지, 3단 본문, 화면 캡처 근거, 과정, 비교, 편집 가능한 글자를 얹은
  그림([`html/pages/`](html/pages/)).
- **원본 시안과 완성본 비교**: 생성 시안과 HTML 완성본을 번갈아 보는 비교 덱을 만들고,
  `npm run build:final`로 완성본만 담은 최종 덱을 만듭니다
  ([`docs/comparison-workflow.ko.md`](docs/comparison-workflow.ko.md)).
- **이미지 브리프 템플릿**: 여러 장의 그림을 같은 기준으로 생성합니다
  ([`templates/image-brief.ko.md`](templates/image-brief.ko.md)).

## 설치

Node.js 20 이상이 필요합니다. `npm install`은 필요 없습니다.

**Claude Code 플러그인으로:**

```
/plugin marketplace add ww-w-ai/marketplace
/plugin install ww-w-slide-gen@ww-w-ai
```

**Codex 플러그인으로:**

```bash
codex plugin marketplace add ww-w-ai/marketplace
codex plugin add ww-w-slide-gen@ww-w-ai
```

업데이트는 `codex plugin marketplace upgrade ww-w-ai` 다음에 같은 `add` 명령을 다시 실행합니다.

**에이전트 없이 템플릿으로:**

```bash
git clone https://github.com/ww-w-ai/ww-w-slide-gen /tmp/ww-w-slide-gen
node /tmp/ww-w-slide-gen/scripts/new-deck.js /absolute/path/my-deck
node /absolute/path/my-deck/scripts/build-deck.js
```

`/absolute/path/my-deck/html/deck.html`을 데스크톱 브라우저로 엽니다(macOS `open`, Windows
`start`, Linux `xdg-open`). 제목·푸터·브랜드·장 순서는 [CUSTOMIZE.ko.md](CUSTOMIZE.ko.md)를 따라
바꿉니다.

| 고칠 곳 | 용도 |
|---|---|
| `deck.config.json` | 제목, 푸터, 내보낼 파일 이름, 장 순서, `storageKey`, `uiLang` |
| `html/theme.css` | 브랜드 색, 글꼴, 간격, 면 |
| `html/components.css` | 공통 제목·카드·스크린샷·푸터 컴포넌트 |
| `html/pages.css` | 장별 레이아웃 |
| `html/pages/*.html` | 슬라이드 내용 |
| `templates/blank-slide.html` | 새 장의 출발점 |
| `assets/` | 폰트, 스크린샷, 글자 없는 그림 |

## 만든 곳

엔진은 [ww-w-ai/ax-lecture](https://github.com/ww-w-ai/ax-lecture)의 강연 덱에서 시작했습니다.
Pretendard 폰트는 SIL Open Font License로 포함돼 있습니다.
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)를 보세요.

[DubDubDub Corp.](https://ww-w.ai) 제작 · 코드(스크립트·CSS·HTML)는 [MIT](LICENSE),
문서 본문은 [CC BY 4.0](LICENSE-CONTENT.md).
