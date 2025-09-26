import { videoSegmentManager } from '@/utils/video/segmentManager'
import type { ClipItem } from '@/app/(route)/editor/types'

describe('VideoSegmentManager time mapping', () => {
  beforeEach(() => {
    // Reset manager
    videoSegmentManager.clearDeletions()
  })

  test('parses HH:MM:SS timeline and maps playable ranges', () => {
    const clips: ClipItem[] = [
      {
        id: 'c1',
        timeline: '0:00:00',
        duration: '5초',
        speaker: 'A',
        subtitle: 'hello',
        fullText: 'hello',
        thumbnail: '',
        words: [],
        stickers: [],
      },
      {
        id: 'c2',
        timeline: '0:00:05',
        duration: '5초',
        speaker: 'B',
        subtitle: 'world',
        fullText: 'world',
        thumbnail: '',
        words: [],
        stickers: [],
      },
      {
        id: 'c3',
        timeline: '0:00:10',
        duration: '5초',
        speaker: 'C',
        subtitle: 'again',
        fullText: 'again',
        thumbnail: '',
        words: [],
        stickers: [],
      },
    ]

    const videoDuration = 15
    videoSegmentManager.initialize(clips, videoDuration)

    // delete middle segment (5-10s)
    videoSegmentManager.deleteClip('c2')

    const ranges = videoSegmentManager.getPlayableRanges()
    expect(ranges).toHaveLength(2)
    // first playable: 0-5s maps to adjusted 0-5
    expect(ranges[0]).toEqual({
      start: 0,
      end: 5,
      originalStart: 0,
      originalEnd: 5,
    })
    // second playable: 10-15s maps to adjusted 5-10
    expect(ranges[1]).toEqual({
      start: 5,
      end: 10,
      originalStart: 10,
      originalEnd: 15,
    })

    // map adjusted 6s -> original 11s (skips deleted)
    expect(videoSegmentManager.mapToOriginalTime(6)).toBeCloseTo(11)
    // time inside deleted original range -> no adjusted time
    expect(videoSegmentManager.mapToAdjustedTime(7)).toBeNull()
    // time inside kept original 12s -> adjusted 7s
    expect(videoSegmentManager.mapToAdjustedTime(12)).toBeCloseTo(7)
  })
})
