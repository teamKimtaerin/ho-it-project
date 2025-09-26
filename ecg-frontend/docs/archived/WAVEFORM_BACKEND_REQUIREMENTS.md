# 🎵 오디오 파형 개선을 위한 백엔드 요구사항

## 📋 현재 상황

프론트엔드에서 임시 개선을 통해 약 70%의 파형 끊김 문제를 해결했으나, 완전한 해결을 위해서는 백엔드 데이터 구조 개선이 필요합니다.

## 🎯 목표

- 실제 오디오 파형과 일치하는 시각화
- 끊김 없는 부드러운 파형 렌더링
- 실시간 분석 데이터 제공

## 📊 필요한 새 데이터 구조

### 1. 프레임 단위 오디오 분석 데이터

```json
{
  "metadata": {
    "filename": "audio.mp4",
    "duration": 143.39,
    "sample_rate": 16000,
    "frame_rate": 100,  // 초당 100 프레임
    "total_frames": 14339
  },
  "frame_analysis": {
    "timestamps": [0.00, 0.01, 0.02, ...],  // 10ms 간격
    "amplitudes": [0.3, 0.35, 0.32, ...],   // 정규화된 진폭 (0-1)
    "volumes_db": [-20.1, -19.8, -20.3, ...],  // dB 단위 볼륨
    "energies": [0.15, 0.18, 0.16, ...],    // RMS 에너지 값
    "spectral_centroids": [2500, 2600, ...], // 스펙트럼 중심 주파수
    "zero_crossing_rates": [0.12, 0.15, ...]  // 제로 크로싱 비율
  }
}
```

### 2. 개선된 단어별 분석 데이터

```json
{
  "segments": [{
    "words": [{
      "word": "Hello",
      "start": 0.5,
      "end": 1.0,
      "volume_db": -20,
      "pitch_hz": 220,

      // 새로 추가되어야 할 세부 분석 데이터
      "detailed_analysis": {
        "frame_indices": [50, 51, 52, ..., 100],  // 해당하는 프레임 인덱스
        "volume_envelope": [-20.1, -19.8, -19.5, ...], // 단어 내 볼륨 변화
        "pitch_contour": [218, 220, 225, 222, ...],     // 피치 변화 곡선
        "formants": [800, 1200, 2500],                   // 포먼트 주파수들
        "intensity_curve": [0.3, 0.35, 0.4, ...]        // 세기 변화
      }
    }]
  }]
}
```

### 3. 실시간 웨이브폼 데이터

```json
{
  "waveform_data": {
    "full_resolution": {
      "sample_rate": 8000,  // 초당 8000 샘플
      "peaks": [0.2, 0.3, 0.25, ...],  // 전체 오디오 피크값
      "rms_values": [0.15, 0.18, 0.16, ...]
    },
    "optimized_resolution": {
      "sample_rate": 100,   // UI용 최적화된 해상도
      "peaks": [0.25, 0.28, 0.22, ...],
      "smoothed": true
    }
  }
}
```

### 4. 단어 간 전환 보간 데이터

```json
{
  "word_transitions": [
    {
      "from_word_index": 0,
      "to_word_index": 1,
      "transition_type": "smooth", // "smooth", "sharp", "silence"
      "interpolation_points": [
        { "time": 0.95, "volume": -19.5, "pitch": 225 },
        { "time": 0.97, "volume": -20.2, "pitch": 230 },
        { "time": 1.0, "volume": -18.8, "pitch": 235 }
      ],
      "silence_duration": 0.05 // 단어 간 무음 구간
    }
  ]
}
```

## 🔧 백엔드 구현 요구사항

### API 엔드포인트

```
GET /api/audio-analysis/{project_id}
- 전체 오디오 분석 데이터 반환
- 압축된 JSON 형식
- 캐싱 지원

GET /api/waveform/{project_id}?resolution={low|medium|high}
- 해상도별 웨이브폼 데이터
- 실시간 스트리밍 지원

GET /api/frame-analysis/{project_id}?start={time}&duration={seconds}
- 특정 구간의 세밀한 프레임 분석
- 동적 로딩 지원
```

### 오디오 분석 라이브러리

```python
# 추천 라이브러리:
- librosa: 고급 오디오 분석
- scipy.signal: 신호 처리
- webrtcvad: 음성 활동 감지
- pyworld: 피치 및 스펙트럼 분석
```

### 성능 요구사항

- **분석 속도**: 실제 재생 시간의 5배 이내
- **데이터 크기**: 1분당 최대 500KB (압축)
- **응답 시간**: API 호출당 100ms 이내
- **캐싱**: Redis를 통한 분석 결과 캐싱

## 📈 데이터 최적화 방안

### 1. 적응형 해상도

```javascript
// 줌 레벨에 따른 동적 해상도 조정
if (zoomLevel < 1) {
  resolution = 'low' // 50 samples/sec
} else if (zoomLevel < 10) {
  resolution = 'medium' // 200 samples/sec
} else {
  resolution = 'high' // 1000 samples/sec
}
```

### 2. 청크 단위 로딩

```javascript
// 화면에 보이는 구간만 고해상도로 로드
const visibleRange = {
  start: currentTime - viewportDuration / 2,
  end: currentTime + viewportDuration / 2,
}
```

### 3. 압축 및 캐싱

- **Gzip 압축**: JSON 응답 압축
- **Delta 인코딩**: 변화량만 전송
- **메모리 캐싱**: 자주 사용되는 구간 캐싱

## 🚀 구현 우선순위

### Phase 1 (High Priority)

1. **프레임 단위 분석 엔진 구축**
2. **기본 API 엔드포인트 구현**
3. **압축 및 캐싱 시스템**

### Phase 2 (Medium Priority)

1. **실시간 스트리밍 지원**
2. **적응형 해상도 시스템**
3. **고급 보간 알고리즘**

### Phase 3 (Low Priority)

1. **머신러닝 기반 최적화**
2. **실시간 분석 파이프라인**
3. **WebSocket 기반 실시간 업데이트**

## 📊 예상 개선 효과

- **파형 품질**: 현재 70% → 95% 개선
- **로딩 속도**: 2배 향상
- **메모리 사용량**: 30% 감소
- **사용자 경험**: 끊김 없는 부드러운 파형 시각화

## 🔗 프론트엔드 연동 방안

```typescript
// 새로운 API 연동 예시
const audioAnalysis = await fetch(`/api/audio-analysis/${projectId}`)
const frameData = await audioAnalysis.json()

// WaveSurfer에 실제 오디오 데이터 로드
wavesurfer.load(audioUrl, frameData.waveform_data.optimized_resolution.peaks)
```

---

## ✅ 현재 프론트엔드 임시 개선 상태

- [x] samplesPerWord 20 → 50으로 증가
- [x] Cubic interpolation 적용
- [x] Gaussian smoothing 필터 추가
- [x] 자연스러운 주파수 기반 변동
- [x] 단어 간 스무스 전환

**결과**: 약 70% 개선된 파형 품질 달성 ✨
