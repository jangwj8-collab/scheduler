# 면담 예약 시스템

GitHub Pages로 배포되는 정적 면담 예약 사이트입니다.  
관리자가 가능한 시간 슬롯을 등록하면, 학생들이 30분 단위로 면담을 신청할 수 있습니다.

---

## 📁 파일 구조

```
interview-scheduler/
├── index.html          # 학생용 예약 화면
├── js/
│   ├── data.js         # 공유 데이터 레이어 (localStorage)
│   └── app.js          # 학생용 로직
└── admin/
    ├── index.html      # 관리자 패널
    └── admin.js        # 관리자 로직
```

---

## 🚀 GitHub Pages 배포 방법

1. 이 폴더를 GitHub 리포지토리로 올립니다.
2. **Settings → Pages → Source**: `main` 브랜치, `/ (root)` 선택 후 Save
3. 잠시 후 `https://<username>.github.io/<repo-name>/` 으로 접속 가능

---

## 🔐 관리자 비밀번호 변경

`admin/admin.js` 파일 상단의 `ADMIN_PASSWORD` 값을 변경하세요:

```js
const ADMIN_PASSWORD = 'admin1234'; // ← 여기를 바꾸세요
```

---

## 📌 사용 방법

### 관리자
1. `/admin/` 페이지 접속 → 비밀번호 입력
2. **슬롯 추가**: 날짜 + 시작/종료 시간 입력 후 추가 (30분 단위 자동 분할)
3. **주간 일괄 생성**: 요일 선택 + 시간대 설정으로 한 주치 슬롯 한 번에 생성
4. 예약된 슬롯은 삭제 불가 (예약자 표시됨)

### 학생
1. 메인 페이지(`/`)에서 주간 캘린더 확인
2. **초록색(예약 가능)** 슬롯 클릭
3. 이름, 학번, 이메일 입력 후 예약 확정
4. 하단 **내 예약 현황**에서 확인 및 취소 가능

---

## ⚠️ 데이터 저장 방식

현재는 **브라우저 localStorage**를 사용합니다.  
→ 같은 컴퓨터/브라우저에서만 데이터 공유됨

**실제 운영 시**: GitHub Issues API 또는 외부 백엔드(Firebase, Supabase 등)와 연동을 권장합니다.

---

## 🛠️ 기술 스택

- **순수 HTML/CSS/JS** (프레임워크 없음)
- GitHub Pages 정적 호스팅
- 데이터: `localStorage` (개선 시 GitHub Issues API)
