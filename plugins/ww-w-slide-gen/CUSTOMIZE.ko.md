# 새 소개서를 시작하는 순서

[English](CUSTOMIZE.md) | 한국어

이 폴더 전체를 새 경로로 복사합니다.

## 1. 프로젝트 설정

`deck.config.json`에서 다음을 바꿉니다.

- `deckTitle`: 브라우저 제목.
- `footerBrand`: 모든 `{{footerBrand}}` 자리의 텍스트.
- `storageKey`: 프로젝트마다 다른 값. 예: `acme-intro-v1`.
- `exportFilename`: 브라우저에서 편집 후 다운로드할 파일명.
- `output`: 빌드 결과 파일명. 기본 `deck.html`.
- `slides`: 실제 장표 순서. 각 항목은 `{"file":"pages/01-cover.html"}` 또는 `{"img":"../assets/full-page.png"}` 중 하나.
- `stylesheets`: `theme.css → components.css → pages.css` 순서 유지.
- `uiLang`: `"auto"`(기본값; 브라우저 언어가 한국어면 한국어, 그 외에는 영어), `"en"`, `"ko"` 중 하나. 에디터 UI에만 영향을 주며 장표 내용에는 영향이 없습니다.

캔버스는 1920×1080 고정입니다. JSON에 canvas 값을 추가해도 엔진 해상도가 바뀌지 않습니다.

## 2. 디자인 시스템 정의

[디자인 시스템 가이드](docs/design-system-guide.ko.md)를 따라 승인된 시안에서 색·서체·크기·여백·레이아웃 규칙을 추출합니다. [기본 정의](docs/design-system.ko.md)를 새 프로젝트의 정의로 수정한 뒤 `html/theme.css`에 같은 값을 넣습니다. 문서는 결정 이유, CSS는 실행되는 값의 기준입니다.

색·여백을 바꾸는 동작 예제로 `html/themes/cobalt.css`가 포함되어 있습니다. 기본 노랑·청록 대신 코발트 표지·라임 강조·96px 여백·12px 모서리를 적용하려면 config의 목록만 바꿉니다.

```json
"stylesheets": ["theme.css", "themes/cobalt.css", "components.css", "pages.css"]
```

이 방식은 기본 폰트와 토큰을 상속하고 필요한 차이만 덮어씁니다. 새 브랜드에는 이 override 파일을 복사하거나 theme.css를 직접 바꿔도 됩니다. 기준 샘플의 카드·표·이미지 프레임 위치는 `--page-margin`을 따릅니다. 단, 이미 만들어진 배경 이미지의 그림과 색은 CSS로 변경되지 않습니다.

## 3. 장표 추가

`templates/blank-slide.html`을 `html/pages/07-new-page.html`로 복사합니다. section의 ID를 유일하게 바꾸고 내용을 작성한 뒤 config의 slides에 등록합니다. 빌더가 `data-idx`와 `.s-pagenum`을 실제 순서로 채웁니다.

소스 파일은 HTML 조각입니다. 반드시 `<section class="slide …" id="…">`로 시작하고 section은 중첩하지 않습니다. `<style>`은 추출되지 않으므로 CSS는 `pages.css`에 작성합니다. `s-title` 같은 공통 클래스명과 `#track > .slide` 계약은 유지합니다. 개별 텍스트/이미지를 따로 이동하려면 section의 직접 자식으로 둡니다. 카드 내부 요소는 한 그룹으로 움직입니다.

이미지 경로는 최종 `html/` 위치 기준입니다. 페이지 파일이 pages/ 안에 있어도 `../assets/screenshot.png`를 사용합니다. `<img src="…">`의 큰따옴표를 유지합니다. 현재 빌더는 srcset, picture source, video 및 iframe의 자체완결 변환을 지원하지 않습니다. CSS 배경은 `pages.css`에 `url('../assets/art.png')`로 넣습니다. inline style의 URL은 피합니다.

이미지만 있는 장표(`img`)는 `.s-bg`로 1920×1080 영역에 contain 배치합니다. 원본 비율을 유지하며 비율이 다르면 여백이 생깁니다. 이 방식의 이미지 속 글자는 편집되지 않으므로 최종 장표는 필요에 따라 `.art` + HTML 텍스트로 재구성합니다.

## 4. 빌드와 확인

```sh
node /absolute/path/my-deck/scripts/build-deck.js
npm --prefix /absolute/path/my-deck test
open /absolute/path/my-deck/html/deck.html      # macOS
start /absolute/path/my-deck/html/deck.html     # Windows
xdg-open /absolute/path/my-deck/html/deck.html  # Linux
```

파일을 다른 폴더로 복사해 열어도 이미지와 글꼴이 보여야 합니다. 누락 자산과 외부 URL은 빌드 실패로 알려줍니다. 큰 이미지 여러 장은 HTML 용량을 늘리므로 최종 용도에 맞게 축소한 복사본을 사용합니다.

### 브라우저에서 확인하기

`html/deck.html`을 아무 브라우저로 엽니다. 브라우저가 `file://` 접근을 막으면 폴더를 로컬 서버로 노출한 뒤 그 주소로 엽니다.

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory /absolute/path/my-deck
```

`http://127.0.0.1:8765/html/deck.html`을 브라우저에서 엽니다. 서버는 해당 터미널에서 Ctrl+C로 종료합니다. `0.0.0.0`에 바인딩하거나 Documents 전체를 서버 루트로 쓰지 않습니다. Python 3가 있는 환경의 선택적 미리보기 방법이며, HTML 빌드 자체에는 Python이 필요하지 않습니다.

## 5. 브라우저 수정과 소스 수정

E → 텍스트 더블클릭 → 편집 → Esc → Cmd/Ctrl+S 순서로 편집본을 다운로드합니다. 다운로드한 HTML은 수정 결과를 가진 독립 파일이며 `html/pages/`를 자동 수정하지 않습니다. M으로 바꾼 순서도 동일합니다.

계속 빌드할 프로젝트라면 다운로드본을 보관하고, 바뀐 텍스트·스타일·순서를 원본 페이지/CSS/config에 반영한 다음 재빌드합니다. 에이전트로 반영할 때는 먼저 살아 있는 DOM 또는 다운로드본을 읽고, 해당 장표만 원본과 대조합니다. 확인 없이 리로드하면 저장하지 않은 수정이 사라집니다. 자동 소스 역변환 도구는 이 템플릿에 포함하지 않습니다.

## 6. 전달

정적 HTML은 `html/deck.html`, 라이브 편집본은 다운로드한 HTML을 전달합니다. PDF는 **P**를 눌러 덱 전체를 인쇄하고 PDF로 저장한 뒤 모든 페이지를 확인합니다. Cmd+P는 현재 장만 인쇄합니다. 생성한 이미지 결과물만 전달하면 글자가 이미지에 고정되므로 최종 텍스트는 HTML로 재구성합니다.
공식 워크플로: [원본을 비교한 뒤 별도의 최종본을 만든다](docs/comparison-workflow.ko.md). 비교용 소개서는 보존하세요. `npm run build:final`을 실행하면 퍼블리싱본만 남은 복제본을 만듭니다.
