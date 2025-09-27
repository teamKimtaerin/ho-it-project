# ML 서버 처리 요구사항

## 🚨 긴급 수정 필요 사항

### 1. 타임스탬프 문제 (Critical)

#### 현재 문제

ML 서버가 모든 segments와 words의 타임스탬프를 **0으로 반환**하고 있습니다.

**현재 응답 (잘못됨)**:

```json
{
  "segments": [
    {
      "start_time": 0, // ❌ 모든 세그먼트가 0
      "end_time": 0, // ❌ 모든 세그먼트가 0
      "text": "안녕하세요",
      "speaker": "SPEAKER_00",
      "words": [
        {
          "word": "안녕하세요",
          "start": 0, // ❌ 모든 단어가 0
          "end": 0 // ❌ 모든 단어가 0
        }
      ]
    }
  ]
}
```

#### 필요한 응답

**WhisperX의 실제 타임스탬프를 반환해야 합니다**:

```json
{
  "segments": [
    {
      "start_time": 0.5, // ✅ 실제 시작 시간
      "end_time": 2.3, // ✅ 실제 종료 시간
      "text": "안녕하세요",
      "speaker": "SPEAKER_00",
      "words": [
        {
          "word": "안녕하세요",
          "start": 0.5, // ✅ 단어별 시작 시간
          "end": 2.3 // ✅ 단어별 종료 시간
        }
      ]
    }
  ]
}
```

#### 프론트엔드 영향

- 자막이 비디오와 동기화되지 않음
- 1초 단위 추정 타이밍으로 대체하여 부정확함
- 사용자 경험 저하

---

## 2. 현재 처리 플로우 분석

### WhisperX 처리 단계

1. **음성 인식**: 텍스트 변환
2. **화자 분리**: Speaker diarization
3. **타임스탬프 정렬**: Word-level alignment
4. **감정 분석**: Emotion detection (선택)

### 예상 문제점

```python
# 문제가 될 수 있는 코드 패턴
segments = []
for segment in whisper_result:
    segments.append({
        "start_time": 0,  # ❌ 하드코딩된 0
        "end_time": 0,    # ❌ 하드코딩된 0
        "text": segment["text"],
        # ...
    })
```

### 수정해야 할 코드 패턴

```python
# ✅ 올바른 타임스탬프 추출
segments = []
for segment in whisper_result:
    segments.append({
        "start_time": segment["start"],  # WhisperX의 실제 start
        "end_time": segment["end"],      # WhisperX의 실제 end
        "text": segment["text"],
        "words": [
            {
                "word": word["word"],
                "start": word["start"],  # 단어별 실제 start
                "end": word["end"]       # 단어별 실제 end
            }
            for word in segment.get("words", [])
        ]
    })
```

---

## 3. 검증 체크리스트

### ML 서버 자체 검증

- [ ] WhisperX 결과에서 타임스탬프 정상 추출 확인
- [ ] segments별 start_time, end_time 검증
- [ ] words별 start, end 시간 검증
- [ ] 타임스탬프가 오름차순인지 확인
- [ ] 음성 파일 duration과 마지막 타임스탬프 일치 확인

### 응답 검증 코드 예시

```python
def validate_timestamps(result):
    """타임스탭 검증 함수"""
    for i, segment in enumerate(result["segments"]):
        # 기본 검증
        assert segment["start_time"] >= 0, f"Segment {i}: start_time must be >= 0"
        assert segment["end_time"] > segment["start_time"], f"Segment {i}: end_time must be > start_time"

        # 단어별 검증
        for j, word in enumerate(segment.get("words", [])):
            assert word["start"] >= segment["start_time"], f"Word {j} in segment {i}: word start must be >= segment start"
            assert word["end"] <= segment["end_time"], f"Word {j} in segment {i}: word end must be <= segment end"

    print("✅ Timestamps validation passed")
```

---

## 4. 테스트 데이터

### 테스트 오디오 파일

짧은 테스트 파일(10-20초)로 먼저 검증:

```
"안녕하세요. 저는 테스트 음성입니다. 시간이 정확히 측정되나요?"
```

### 예상 결과

```json
{
  "metadata": {
    "duration": 8.5,
    "speakers": ["SPEAKER_00"],
    "processing_info": {
      "whisper_version": "large-v2",
      "diarization_model": "pyannote/speaker-diarization"
    }
  },
  "segments": [
    {
      "start_time": 0.2,
      "end_time": 1.8,
      "text": "안녕하세요.",
      "speaker": "SPEAKER_00",
      "words": [{ "word": "안녕하세요", "start": 0.2, "end": 1.8 }]
    },
    {
      "start_time": 2.0,
      "end_time": 4.5,
      "text": "저는 테스트 음성입니다.",
      "speaker": "SPEAKER_00",
      "words": [
        { "word": "저는", "start": 2.0, "end": 2.4 },
        { "word": "테스트", "start": 2.5, "end": 3.2 },
        { "word": "음성입니다", "start": 3.3, "end": 4.5 }
      ]
    }
  ]
}
```

---

## 5. 프론트엔드 대응 상황

### 현재 임시 처리

프론트엔드에서는 타임스탬프가 모두 0일 때 임시로 다음과 같이 처리하고 있습니다:

```javascript
// 긴급 대응: 모든 타이밍이 0일 때 추정값 생성
const allTimingsZero = data.segments.every(
  (s) => s.start_time === 0 && s.end_time === 0
)
if (allTimingsZero) {
  log(
    'useUploadModal',
    `⚠️ All timings are 0, estimated duration: ${estimatedDuration}s based on ${data.segments.length} segments`
  )
  // 1초씩 간격으로 추정...
}
```

### ML 수정 후 제거 예정

ML 서버에서 정확한 타임스탬프를 반환하면 이 임시 처리 코드는 제거됩니다.

---

## 6. 우선순위

1. **🔴 High Priority**: 타임스탬프 수정
2. **🟡 Medium**: 응답 속도 최적화
3. **🟢 Low**: 감정 분석 정확도 개선

---

## 7. 문의사항

### 기술적 질문

- WhisperX 버전과 설정 확인
- Speaker diarization 모델 정보
- 현재 타임스탬프 처리 로직

### 테스트 요청

- 수정된 버전으로 테스트 파일 처리 결과 공유
- 프론트엔드와 연동 테스트 일정 협의

---

## 연락처

- **프론트엔드**: [담당자 정보]
- **백엔드**: [담당자 정보]
- **긴급 연락**: [연락처]

---

_Last updated: 2025-09-16_
_문서 버전: 1.0_
