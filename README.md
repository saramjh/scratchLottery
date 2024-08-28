# 스크래치 복권 체험 프로그램

![image](https://github.com/user-attachments/assets/6a2ec62b-1623-48b1-bdd2-9c9baf65b942)

이 프로젝트는 사용자가 복권을 긁어 당첨 여부를 확인할 수 있는 스크래치 복권 체험 프로그램입니다. 사용자는 복권을 긁으며 당첨 결과를 확인할 수 있으며, 확률을 설정하여 복권의 당첨 확률을 조정할 수 있습니다.

복권체험 프로그램 바로가기 <https://saramjh.github.io/scratchLottery/>

참조사이트 링크: <https://velog.io/@aromahyang/%EB%8F%99%EC%A0%84-%EA%B8%81%EA%B8%B0-%EC%95%A0%EB%8B%88%EB%A9%94%EC%9D%B4%EC%85%98/>
스크래치 기능 구현을 참고하였습니다.

## 프로젝트 구성

### 1. HTML 구조

- **header**: 페이지의 헤더로, 프로그램의 제목이 표시됩니다.
- **main**: 주요 컨텐츠 영역으로 복권 스크래치 영역과 정보 섹션을 포함합니다.
  - **section.lottery**: 스크래치 복권을 표시하는 영역으로, 복권을 긁기 위한 캔버스와 버튼들이 포함됩니다.
  - **section.lotteryInfo**: 당첨 확률을 설정하고 당첨 확률표를 표시하는 영역입니다.
  - **section#lotteryBalance**: 복권의 잔액 정보를 표시하는 영역입니다.
  - **section#recordDisplay**: 복권 긁기 기록을 표시하는 영역입니다.
- **footer**: 페이지의 푸터로, 마우스를 올리면 추가 정보가 표시됩니다.
- **div#jackpotModal**: 당첨 결과를 모달로 표시하는 영역입니다.

### 2. CSS 스타일

- **기본 스타일**: 모든 요소의 기본 스타일을 초기화하고, 폰트와 박스 모델을 설정합니다.
- **레이아웃**: 페이지 전체 레이아웃을 flexbox를 사용하여 구성하며, 각 섹션의 스타일을 설정합니다.
- **모달 및 버튼 스타일**: 모달과 버튼의 스타일을 설정하여 사용자 인터페이스를 개선합니다.
- **미디어 쿼리**: 모바일 해상도에 대응하기 위한 스타일 조정이 포함되어 있습니다.

### 3. JavaScript 기능

- **캔버스 초기화**: 스크래치 복권의 캔버스를 초기화하고, 회색 커버와 안내 문구를 추가합니다.
- **스크래치 기능**: 사용자가 마우스로 긁을 때 캔버스의 일정 영역을 투명하게 만들어 복권의 당첨 여부를 확인합니다.
- **당첨 확률 계산**: 사용자가 설정한 확률에 따라 각 등수의 당첨 확률을 계산합니다.
- **당첨 결과 표시**: 당첨 결과를 모달로 표시하며, 당첨된 경우에는 모달이 자동으로 나타납니다.

## 설치 및 사용 방법

1. **저장소 클론하기**

   ```bash
   git clone <저장소 URL>
   cd <저장소 디렉토리>
   ```

2. **브라우저에서 열기**

   `index.html` 파일을 웹 브라우저에서 열어 프로그램을 실행합니다.

## 파일 설명

- **index.html**: HTML 구조와 스타일을 정의하는 파일입니다.
- **script.js**: 스크래치 복권의 기능을 구현하는 JavaScript 파일입니다.

## 주의 사항

- 브라우저 호환성 문제를 최소화하기 위해 최신 브라우저에서 테스트하였습니다.
- 모바일 화면에서 사용 시, 미디어 쿼리를 통해 적절한 레이아웃이 적용됩니다.

## 기여

기여를 원하시는 분은 Pull Request를 통해 수정사항을 제출해 주세요. 이슈가 있는 경우, 이슈 트래커를 통해 보고해 주세요.

## 라이센스

이 프로젝트는 [MIT 라이센스](LICENSE)를 따릅니다.
