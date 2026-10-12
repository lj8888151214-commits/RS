# 🌡️ RS (Road Microclimate Simulation)
> **GIS 도로망 & 열 물리 엔진 기반 3D 노면 미기후 및 4륜 타이어 열접지 시뮬레이션 웹 서비스**

---

### 💡 1. 기획 의도 및 배경

| 항목 | 내용 |
| :--- | :--- |
| **미기후 및 노면 과열 진단** | 일사량, 태양 고도각, 주변 건물 차폐(GIS) 및 기상청 API 데이터를 융합하여 도로 구간별 실시간 아스팔트 노면 온도를 추정합니다. |
| **차량 주행 안전 모니터링** | 고온 노면 접지 시 타이어 과열 위험을 실시간으로 감지하고, 위험 온도 구간(35°C 초과 등) 진입 시 즉각적인 경고 뱃지를 시각화합니다. |
| **3D 디지털 트윈 스트리트뷰 연동** | 구글 스트리트뷰 파노라마 좌표계와 Three.js 3D 공간을 동기화하여 실제 도로 위에 4륜 타이어의 주행 궤적 및 열접지 환경을 입체적으로 가시화합니다. |

---

### 🛠 2. 사용 기술 (Tech Stack)

#### Backend & Physics Engine
<p>
  <img src="https://img.shields.io/badge/Java_17-007396?style=flat-square&logo=openjdk&logoColor=white"/>
  <img src="https://img.shields.io/badge/Spring_Boot_3.x-6DB33F?style=flat-square&logo=springboot&logoColor=white"/>
  <img src="https://img.shields.io/badge/Spring_Data_JPA-59666C?style=flat-square&logo=hibernate&logoColor=white"/>
  <img src="https://img.shields.io/badge/Thermal_Physics_Engine-FF6F00?style=flat-square&logoColor=white"/>
</p>

#### Frontend & 3D Visualization
<p>
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=three.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/Google_Maps_StreetView-4285F4?style=flat-square&logo=googlemaps&logoColor=white"/>
</p>

#### Spatial Data & External API
<p>
  <img src="https://img.shields.io/badge/GIS_Building_Service-009688?style=flat-square&logoColor=white"/>
  <img src="https://img.shields.io/badge/Solar_Position_Engine-FFA000?style=flat-square&logoColor=white"/>
  <img src="https://img.shields.io/badge/Weather_API-0288D1?style=flat-square&logoColor=white"/>
</p>

#### DevOps & Tools
<p>
  <img src="https://img.shields.io/badge/Git-F05032?style=flat-square&logo=git&logoColor=white"/>
  <img src="https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white"/>
</p>

---

### ⏱ 3. 개발 일정 (Sprint)

| 단계 | 구분 | 주요 작업 내용 |
| :---: | :--- | :--- |
| **Step 1** | **백엔드 열 물리 엔진 구축** | 태양 고도/방위각 계산(`SolarPositionService`), 기상청 데이터 연동, 노면 복사열 및 건물 차폐 GIS 시뮬레이션 모델 수립 |
| **Step 2** | **3D 렌더링 파이프라인 설계** | React + Three.js 기반 GLTF 로더 연동, 4륜 차체 규격(차폭 1.4m, 축간 2.2m) 설계 및 로컬 원점 정규화 |
| **Step 3** | **주행 궤적 및 좌표계 동기화** | 구글 스트리트뷰 도로 헤딩각(Heading) 기반 차량 전방 추적, 오일러 축 간섭 보정 및 11자 직진 구름 애니메이션 구현 |
| **Step 4** | **열접지 경고 및 UI 시각화** | Canvas 기반 실시간 노면 접지 온도 뱃지(Sprite), 위험 온도 구간 시각 경고 오버레이 및 송도 도로망 좌표 매핑 |

---

### 🚀 4. 핵심 기술 구현 사항

- **GIS 및 태양 궤적 기반 도로 미기후 시뮬레이션 엔진**
  - 실시간 기상 데이터(기온, 습도, 풍속)와 위경도 기반 태양 방위각/고도각을 계산하여 노면 도달 일사량 정밀 산출
  - 건물 높이 및 방위 정보를 결합한 GIS 차폐 모델링을 통해 그늘/양지 구간별 아스팔트 표면 온도 분기 예측
- **Three.js 기반 4륜 타이어 GLB 로컬 피벗 영점화 및 기립 축 보정**
  - GLTF 3D 타이어 모델 로드 시 지오메트리 중심을 로컬 `(0, 0, 0)`으로 강제 정렬(`geometry.center()`)하여 회전 시 바퀴 뜀 현상 방지
  - 오일러 회전 간섭을 제거하고 YXZ 회전 락(Lock)을 적용하여 도로 진행 방향에 맞는 11자 수직 기립 및 단일 축 롤링 모션 확립
- **스트리트뷰 파노라마 - 3D 차량 헤딩 동기화**
  - 스트리트뷰 시점의 카메라 각도 및 도로 방위각을 라디안으로 변환하여 차량 그룹의 월드 Yaw 축에 실시간 반영
  - 도로 전방 6.0m 지점에 4륜 섀시를 지면 밀착 안착시켜 현실감 있는 증강 현실형 주행 뷰 연출
- **Canvas Texture 기반 동적 노면 상태 뱃지 오버레이**
  - 3D 공간 내 텍스트 왜곡과 Z-fighting을 방지하기 위해 단일 Sprite 뱃지 시스템 구축
  - 노면 온도 임계치(35°C)에 따라 동적으로 상태(정상접지 / 과열주의) 및 테마 컬러 전환

---

### 📱 5. 주요 화면 시각 자료

| 3D 도로 미기후 & 4륜 타이어 접지 시뮬레이션 (인천 송도) | 노면 과열 모니터링 및 3D 뱃지 상세 |
| :---: | :---: |
| <!-- 캡처하신 브라우저 실행 화면 이미지를 여기에 드래그 앤 드롭하세요 --> <br> <img width="809" height="438" alt="image" src="https://github.com/user-attachments/assets/f3d49107-ae4a-458f-8178-8cf80c7c853b" />
| <!-- 상세 뱃지 또는 기능 화면 이미지를 여기에 드래그 앤 드롭하세요 --> <br> ![상세 시각화](이미지_URL_또는_상대경로) |
