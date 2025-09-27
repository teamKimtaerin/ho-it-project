[x] env.local 의 NEXT_PUBLIC_DEBUG_UI=false 일 때 dev로 런하더라도 editor 페이지의 debug 용 UI (영상 밑의 가상 타임라인 세그먼트 및 설정(JSON))이 없어지지 않음 - Fixed: VideoSection.tsx에서 DEBUG_UI 환경변수로 조건부 렌더링 적용

[x] **중요** 애니메이션 적용 로직
[x] 애니메이션 에셋 사이드바에서 애니메이션을 수정했을 때 만들어진 scenario.json이 영상에 attach되지 않음 (영상 자막에 애니메이션이 적용안됨) - Fixed: EditorMotionTextOverlay의 useEffect dependency에 wordAnimationTracks 추가하여 자동 시나리오 갱신
[x] plugin server에서 불러온 manifest.json에 schema에 parameter 기본값이 명시되어있는데, 해당 값이 scenario.json에 초기 입력되지 않음 - Fixed: addAnimationTrackAsync에서 이미 getPluginDefaultParams로 기본값 로딩 중, 서버 URL만 수정 (localhost:3300)
[x] manifest.json에 timeOffset이 명시되어있는데, 이 것이 반영되지 않음 - Fixed: addAnimationTrackAsync에서 이미 getPluginTimeOffset으로 timeOffset 로딩 중, 서버 URL만 수정
[x] scenario.json에 반영되지 않음 - Fixed: initialScenario.ts에서 pluginChain에 timeOffset 포함하도록 이미 구현됨
[x] sound wave에 해당 값이 반영되어 들어가지 않음 - Fixed: 위의 수정으로 해결됨
[x] sound wave에 애니메이션 블럭의 크기 및 위치를 좌우 조정했을 때 scenario의 timeOffset이 수정되지 않음 - Fixed: updateAnimationTrackTiming에서 timeOffset 계산 및 업데이트 로직 추가

[x] asset control panel UI
[x] scrollable 하지 않음 - Fixed: AssetControlPanel에 max-h-80 overflow-y-auto 적용
