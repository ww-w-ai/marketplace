# 맞춤형 CSS를 만드는 법

[English](css-customization.md) | 한국어

## 수정 위치

| 바꾸려는 것 | 파일 | 예 |
|---|---|---|
| 전체 브랜드 | `theme.css` | 글꼴·색·글자 크기·안전 여백 |
| 반복 컴포넌트 | `components.css` | 모든 카드의 패딩과 테두리 |
| 한 장의 배치 | `pages.css` | 특정 장의 제목 두 줄, 이미지 크기 |
| 문장·순서 | 페이지 HTML / config | CSS로 텍스트를 만들지 않음 |

로드 순서는 theme → components → pages입니다. 세 파일을 빌드 시 HTML 안에 포함합니다. 런타임 편집 UI의 고정 스타일은 빌더에 유지되므로 `.slide` 내부만 꾸밉니다.

## 예: 같은 엔진에 다른 브랜드 적용

`theme.css`의 해당 값을 수정합니다.

```css
:root {
  --bg: #ffffff;
  --surface: #f1f4fb;
  --text: #101828;
  --muted: #475467;
  --primary: #1536b8;
  --primary-soft: #eaf0ff;
  --accent: #b6e600;
  --on-accent: #101828;
  --cover-bg: #1536b8;
  --cover-text: #ffffff;
  --radius: 12px;
}
```

이 변경은 HTML 컴포넌트에 적용됩니다. SVG·사진·생성 이미지 배경의 색은 자산 자체에 들어 있으므로 별도로 변경하거나 재생성해야 합니다.

실행 가능한 동일 계열 예제는 `html/themes/cobalt.css`입니다. `deck.config.json`에서 `theme.css` 다음에 추가하면 적용됩니다. 원본 팔레트로 돌아갈 때는 목록에서 빼면 됩니다. 예제는 여백도 96px로 바꿔 공통 제목·푸터와 카드·표가 함께 이동하는 것을 보여줍니다.

## 예: 카드 재사용

```css
.card {
  background: var(--surface);
  color: var(--text);
  padding: var(--space-6);
  border-radius: var(--radius);
}
```

다른 장표도 같은 `.card`를 씁니다. 카드마다 hex 색을 반복해서 적으면 테마 교체가 누락됩니다.

## 예: 두 줄 제목 장표

```css
#customer-story .s-title { max-width: 1450px; }
#customer-story .s-lead { top: 318px; }
#customer-story .s-body { top: 414px; }
```

기본 제목 아래의 lead는 한 줄 제목을 기준으로 배치되어 있습니다. 두 줄로 길어지면 제목 크기만 줄이기보다 아래 영역을 함께 내려 겹침을 해소합니다. 개별 파일의 `<style>`은 빌더가 가져오지 않습니다.

## 이미지 위 좌표 맞추기

시안의 실제 폭을 W, 높이를 H라 하면 x 좌표는 `x * 1920 / W`, y 좌표는 `y * 1080 / H`로 옮깁니다. 가로세로 비율이 다른 그림은 먼저 crop 또는 contain을 결정하고 생긴 여백/잘림만큼 좌표를 보정합니다. 출력이 반드시 1920×1080이라는 가정을 하지 않습니다.

```css
#launch .art { object-fit: cover; }
#launch .s-title { left: 80px; top: 180px; width: 1100px; }
```

참고 시안과 텍스트를 제거한 배경을 별도로 보관합니다. 흰 사각형으로 덮으면 무늬·그라데이션이 깨지는 경우는 인페인팅으로 제거합니다. 제목·본문·배지·화살표 라벨도 편집 대상입니다.

## 피해야 할 패턴

```css
/* Rejected: every slide changes, and the theme stops controlling color. */
h1 { color: red !important; font-size: 46px !important; }

/* Accepted: one page owns its layout exception. */
#customer-story .s-title { max-width: 1450px; }
```

`#track`, `#viewport`의 크기/transform은 엔진 소유입니다. 장표 디자인을 바꾸면서 수정하면 이동·편집 좌표·인쇄가 함께 깨집니다. 좌표는 1920×1080 기준 px를 쓰고 vw/vh는 장표 내부에서 피합니다. 문자열은 `::before { content: ... }`로 생성하지 않습니다. 그래야 편집과 복사, 출력에서 실제 텍스트가 유지됩니다.

## 검증

테마를 바꾼 뒤 모든 샘플 장표를 봅니다. 긴 문장, 화면 증거 비율, 푸터, 페이지 번호를 확인합니다. E 모드로 제목을 편집하고 다운로드본을 다시 엽니다. 전체 PDF를 출력하고 첫 장뿐 아니라 마지막 장과 표도 확인합니다. Node 테스트는 렌더링을 판정하지 않습니다.
