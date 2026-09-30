# ww-w Slide Gen

[English](README.md) | 한국어

**요즘 이미지 모델은 웬만한 템플릿보다 슬라이드를 더 잘 그립니다. 그런데 그 안의 글자는 전부
픽셀이라 오타 하나, 숫자 하나, 폰트 하나를 못 고칩니다. ww-w Slide Gen은 모델이 잡은 디자인은
그대로 두고, 글자만 전부 편집 가능한 HTML로 다시 얹습니다.** 결과물은 `deck.html` 한 파일입니다.
그대로 발표하고(**F**), 브라우저에서 바로 고치고(**E**), PDF로 뽑습니다(**P**). 단축키 전체는
**?**로 봅니다. Claude Code·Codex 플러그인과 그 바탕이 되는 슬라이드 엔진이 함께 들어 있습니다.
엔진은 npm 의존성이 하나도 없고, 샘플 6장을 0.06초에 빌드하며(Node 24, Apple M2), 폰트와
이미지를 HTML 파일 하나에 모두 담습니다.

## 슬라이드 한 장이 만들어지는 과정

그림이 필요한 장마다 스킬이 같은 다섯 단계를 밟습니다.

1. **틀을 잡습니다.** 디자인 시스템이 헤더·푸터·본문 영역의 위치를 정해서, 모든 장이 같은 자리에
   맞춰집니다.
2. **슬라이드 전체를 이미지 한 장으로 생성합니다.** Codex(없으면 ChatGPT, [이미지](#이미지) 참고)가
   실제 문구를 넣은 완성 슬라이드를 그립니다. 그래서 구도가 실제 글자 양에 맞춰 잡힙니다.
3. **사람이 내용을 확인합니다.** 아직 그림 한 장일 때 고치는 게 가장 쌉니다.
4. **글자만 뺀 이미지를 다시 생성합니다.** 슬라이드 문구만 지우고, 그림의 일부인 글자(그려진 기기
   화면 속 라벨 같은 것)는 남깁니다.
5. **Claude가 글자를 HTML로 같은 자리에 다시 얹습니다.** 디자인 시스템 영역을 벗어난 부분은 줄이거나
   옮겨서 틀에 맞춥니다.

## 왜 결과물이 잘 나오나

- **각자 잘하는 일만 맡깁니다.** 이미지 모델은 구도·색·일러스트·분위기를, HTML은 정확한 글자·브랜드
  폰트·한글 타이포그래피·편집을 맡습니다.
- **모델이 실제 문구로 디자인합니다.** 임시 문구가 아니라 실제 글자에 맞춰 배치하므로, 나중에 글자를
  억지로 욱여넣을 일이 없습니다.
- **틀이 30장짜리 덱도 한 벌로 묶습니다.** 5단계에서 제목·여백·푸터를 디자인 시스템에 다시 맞추기
  때문에, 생성 이미지마다 조금씩 다른 부분이 최종 덱 전에 바로잡힙니다.
- **근거는 실제 화면을 씁니다.** 제품 화면은 원본 캡처를 이미지로 넣고, 생성하지 않습니다.
- **모든 글자를 계속 고칠 수 있습니다.** 발표 5분 전에 찾은 오타도 다시 생성할 필요 없이 브라우저에서
  클릭 한 번으로 고칩니다.

## 왜 만들었나

저희는 피치덱·제품 소개서·제안서를 직접 만드는데, 매번 같은 세 가지에서 막혔습니다.

1. **생성한 슬라이드는 보기 좋지만 고칠 수 없습니다.** 한 단어를 고치려면 그 장을 다시 생성해야
   하고, 새로 나온 장은 이전 장과 잘 맞지 않습니다.
2. **덱마다 디자인을 새로 시작합니다.** 색·여백·제목 크기를 이어 줄 장치가 없어 덱마다 조금씩
   달라집니다.
3. **슬라이드 앱은 덱을 에이전트 손에서 떼어 놓습니다.** Claude와 Codex는 읽고, 비교하고, 다시
   빌드할 수 있는 평범한 파일일 때 가장 잘 일합니다.

그래서 엔진을 평범한 파일 위에 만들었습니다. 슬라이드는 HTML 페이지, 브랜드는 CSS 토큰, 생성
이미지는 그림만 담고, 빌드가 이 모두를 어디서나 열리는 HTML 파일 하나로 묶습니다.

| | 이미지로만 만든 슬라이드 | 슬라이드 앱 (PowerPoint, Google Slides) | ww-w Slide Gen |
|---|---|---|---|
| 디자인 | 장마다 생성 | 템플릿 | 생성한 뒤 디자인 시스템에 맞춤 |
| 오타 수정 | 다시 생성 | 편집 | 브라우저에서 편집 (**E**) |
| 덱 사이 브랜드 유지 | 안 됨 | 템플릿 단위 | 파일 하나의 CSS 토큰 |
| 에이전트가 읽고 비교 | 안 됨 | 바이너리 또는 API | 평범한 HTML·CSS |
| 결과물 | 이미지 | 앱 파일 | 단일 `deck.html`, **P**로 PDF |

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
5. 그림이 필요한 장에는 위의 다섯 단계를 밟습니다.
6. `deck.html`을 빌드하고, 모든 장을 직접 보고, 고치고 다시 빌드합니다.
7. 덱 경로, 장 목록, 아직 확인하지 못한 내용을 보고합니다.

단계와 단계별 통과 조건은 [`skills/ww-w-slide-gen/SKILL.md`](skills/ww-w-slide-gen/SKILL.md)에 있습니다.

## 단축키

`html/deck.html`을 데스크톱 브라우저로 엽니다.

| 키 | 동작 |
|---|---|
| ← → · Space · PgUp/PgDn | 이전 / 다음 장 |
| 숫자 입력 후 Enter | 해당 장으로 이동 |
| Home / End | 처음 / 마지막 장 |
| **F** | 전체화면 |
| **P** | 덱 전체 인쇄. 장마다, 애니메이션 단계마다 한 쪽씩 (PDF로 저장) |
| **E** | 편집 모드: 클릭해 선택, 드래그로 이동, 모서리로 크기 조절, 글자를 더블클릭해 수정 |
| **D** · **G** · Del (편집 중) | 복제 · 묶기와 풀기 · 삭제 |
| **X** (편집 중) | 남은 흔적을 단색 조각으로 가리기 |
| ⌘Z · ⇧⌘Z | 되돌리기 · 다시 하기 |
| **M** | 장 순서 바꾸기 (← → 이동, Enter 적용, Esc 취소) |
| **L** | 정렬 가이드 |
| ⌘S | 고친 덱을 HTML 파일 하나로 내려받기 |
| **?** | 단축키 전체 보기 |

편집 내용은 덱마다 다른 `storageKey`로 브라우저에 저장되므로 두 덱이 섞이지 않습니다.
Cmd+P는 지금 보는 장만 인쇄합니다. 덱 전체는 **P**를 누릅니다.

## 어떻게 만들어져 있나

- **슬라이드**는 1920×1080 고정 캔버스 위의 평범한 HTML 섹션이고, 창 크기에 맞춰 확대·축소됩니다
  ([`html/pages/`](html/pages/)).
- **브랜드**는 [`html/theme.css`](html/theme.css)의 CSS 변수입니다. 컴포넌트와 레이아웃은 이 변수만
  읽습니다. 뒤에 [`html/themes/cobalt.css`](html/themes/cobalt.css)를 붙이면 같은 슬라이드를 다른
  방향으로 볼 수 있고, 브랜드를 처음부터 정하려면 [디자인 시스템 가이드](docs/design-system-guide.ko.md)를
  따릅니다.
- **빌드**는 Node 스크립트 하나([`scripts/build-deck.js`](scripts/build-deck.js))입니다.
  `deck.config.json`을 읽고, 스타일시트·폰트·이미지를 모두 data URL로 넣어 `html/deck.html`을
  씁니다. 결과물에 외부 스타일시트·이미지 참조가 없는지, 폴더를 복사해도 원래 경로 없이 빌드되는지를
  테스트가 확인합니다([`tests/build.test.js`](tests/build.test.js)).
- **편집기**는 빌드된 파일 안의 평범한 JavaScript입니다. 서버도 계정도 필요 없습니다.
- **인쇄**는 16:9 `@page`를 씁니다. **P**는 모든 장과 애니메이션 단계를 한 쪽씩 펼친 뒤 인쇄 창을
  엽니다.
- **편집기 언어**: 화면 문구 71개가 영어·한국어 표 하나에 있습니다. `"uiLang": "auto"`면 브라우저
  언어가 한국어일 때 한국어, 그 밖에는 영어로 나옵니다. 두 표가 어긋나거나 도움말 문구가 표를 거치지
  않으면 테스트가 실패합니다([`tests/i18n.test.js`](tests/i18n.test.js)).

### 이미지

빌드 자체는 이미지 API를 부르지 않습니다. 스킬은 쓸 수 있는 도구를 이 순서로 고릅니다.

1. **Codex** — 내장 `image_gen`, 자산 하나당 한 번 호출.
2. **Claude Code에서 Codex CLI** — `codex exec`로 같은 작업을 Codex에 맡깁니다.
3. **브라우저의 ChatGPT** — Codex가 없으면 브라우저 자동화 도구(browser-use, Claude in Chrome)가
   로그인된 브라우저에서 chatgpt.com을 열고, 같은 프롬프트를 보내고, 이미지를 `assets/`에
   저장합니다.
4. **호스트가 제공하는 이미지 도구**, 또는 직접 준비한 이미지.

상세 절차와 장별 의뢰서: [`docs/image-workflow.ko.md`](docs/image-workflow.ko.md) ·
[`templates/image-brief.md`](templates/image-brief.md) · 예시 장
[`html/pages/06-artwork.html`](html/pages/06-artwork.html).

## 함께 들어 있는 것

- **샘플 레이아웃 6종**: 표지, 3단 본문, 화면 근거, 과정, 비교, 편집 가능한 글자를 얹은 아트워크
  ([`html/pages/`](html/pages/)).
- **원본·완성본 비교 검토**: 생성 목업과 HTML 완성본을 번갈아 보여 주는 덱을 만들고, 검토가 끝나면
  `npm run build:final`로 완성본만 담은 덱을 만듭니다
  ([`docs/comparison-workflow.ko.md`](docs/comparison-workflow.ko.md)).

## 설치

Node.js 20 이상이 필요합니다. `npm install` 단계는 없습니다.

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

업데이트는 `codex plugin marketplace upgrade ww-w-ai`를 실행한 뒤 같은 `add` 명령을 다시 실행합니다.

**에이전트 없이 템플릿으로:**

```bash
git clone https://github.com/ww-w-ai/ww-w-slide-gen /tmp/ww-w-slide-gen
node /tmp/ww-w-slide-gen/scripts/new-deck.js /absolute/path/my-deck
node /absolute/path/my-deck/scripts/build-deck.js
```

`/absolute/path/my-deck/html/deck.html`을 데스크톱 브라우저로 엽니다(macOS `open`, Windows `start`,
Linux `xdg-open`). 제목·푸터·브랜드·장 순서는 [CUSTOMIZE.ko.md](CUSTOMIZE.ko.md)를 따라 정합니다.

| 수정할 곳 | 용도 |
|---|---|
| `deck.config.json` | 제목, 푸터, 내보내기 파일명, 장 순서, `storageKey`, `uiLang` |
| `html/theme.css` | 브랜드 색, 글꼴, 간격, 면 |
| `html/components.css` | 공통 제목·카드·스크린샷·푸터 컴포넌트 |
| `html/pages.css` | 장별 레이아웃 |
| `html/pages/*.html` | 슬라이드 내용 |
| `templates/blank-slide.html` | 새 장의 출발점 |
| `assets/` | 폰트, 스크린샷, 글자 없는 아트워크 |

## 만든 곳

엔진은 [ww-w-ai/ax-lecture](https://github.com/ww-w-ai/ax-lecture)의 강의 슬라이드에서 시작했습니다.
Pretendard는 SIL Open Font License로 동봉합니다. [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)를
참고하세요.

[DubDubDub Corp.](https://ww-w.ai) 제작 · 코드(스크립트, CSS, HTML)는 [MIT](LICENSE), 문서 본문은
[CC BY 4.0](LICENSE-CONTENT.md).
