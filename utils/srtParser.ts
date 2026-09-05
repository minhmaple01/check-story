export interface Subtitle {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
}

export const timeToSeconds = (timeStr: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(',');
  const time = parts[0];
  const ms = parts[1] || '0';
  const [hours, minutes, seconds] = time.split(':');
  return parseInt(hours || '0') * 3600 + parseInt(minutes || '0') * 60 + parseInt(seconds || '0') + parseInt(ms) / 1000;
};

export const formatSeconds = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const formatSecondsToSRT = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const ms = Math.floor((totalSeconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};

export interface SRTError {
  index: number;
  id: number;
  startTime: string;
  endTime: string;
  type: 'overlap' | 'gap';
  message: string;
}

export const validateSRT = (subtitles: Subtitle[]): SRTError[] => {
  const errors: SRTError[] = [];
  
  for (let i = 0; i < subtitles.length; i++) {
    const current = subtitles[i];
    const currentStart = timeToSeconds(current.startTime);
    const currentEnd = timeToSeconds(current.endTime);
    
    if (i > 0) {
      const previous = subtitles[i - 1];
      const previousEnd = timeToSeconds(previous.endTime);
      
      // Check overlap
      if (currentStart < previousEnd) {
        errors.push({
          index: i,
          id: current.id,
          startTime: current.startTime,
          endTime: current.endTime,
          type: 'overlap',
          message: `Lỗi chồng chéo: Bắt đầu (${current.startTime}) trước khi đoạn trước kết thúc (${previous.endTime})`
        });
      }
      
      // Check gap > 12s
      const gap = currentStart - previousEnd;
      if (gap > 12) {
        errors.push({
          index: i,
          id: current.id,
          startTime: current.startTime,
          endTime: current.endTime,
          type: 'gap',
          message: `Lỗi khoảng trống: Khoảng cách giữa 2 đoạn là ${gap.toFixed(1)} giây (vượt quá 12s)`
        });
      }
    }
  }
  
  return errors;
};

export const breakSubtitleLines = (subtitles: Subtitle[], maxLength: number = 55): Subtitle[] => {
  const result: Subtitle[] = [];
  let nextId = 1;

  for (const sub of subtitles) {
    if (sub.text.length <= maxLength) {
      result.push({ ...sub, id: nextId++ });
      continue;
    }

    // Split logic
    const parts: string[] = [];
    let remaining = sub.text;
    const delimiters = ['。', '、', '！', '？', '…', '・', ' '];

    while (remaining.length > maxLength) {
      let splitIndex = -1;
      
      // Priority search: find the highest priority delimiter within the maxLength range
      for (const d of delimiters) {
        const lastIdx = remaining.lastIndexOf(d, maxLength - 1);
        if (lastIdx !== -1) {
          splitIndex = lastIdx + 1;
          break; // Found the highest priority delimiter
        }
      }

      if (splitIndex === -1) {
        // Fallback: force split at maxLength
        splitIndex = maxLength;
      }

      parts.push(remaining.substring(0, splitIndex).trim());
      remaining = remaining.substring(splitIndex).trim();
    }

    if (remaining) {
      parts.push(remaining);
    }

    const startSec = timeToSeconds(sub.startTime);
    const endSec = timeToSeconds(sub.endTime);
    const totalDuration = endSec - startSec;
    const totalChars = sub.text.length;

    let currentStart = startSec;
    for (let i = 0; i < parts.length; i++) {
      const partText = parts[i];
      const partDuration = (partText.length / totalChars) * totalDuration;
      const partEnd = currentStart + partDuration;

      result.push({
        id: nextId++,
        startTime: formatSecondsToSRT(currentStart),
        endTime: formatSecondsToSRT(i === parts.length - 1 ? endSec : partEnd),
        text: partText
      });

      currentStart = partEnd;
    }
  }

  return result;
};

export const parseSRT = (srtContent: string): Subtitle[] => {
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/).filter(b => b.trim().length > 0);
  
  return blocks.map(block => {
    const lines = block.split('\n');
    const id = parseInt(lines[0], 10);
    const timeLine = lines[1] || '';
    const [startTime, endTime] = timeLine.includes(' --> ') ? timeLine.split(' --> ') : ['', ''];
    const text = lines.slice(2).join('\n');
    return { id, startTime, endTime, text };
  }).filter(sub => !isNaN(sub.id) && sub.startTime && sub.endTime);
};

export const stringifySRT = (subtitles: Subtitle[]): string => {
  return subtitles.map(sub => {
    return `${sub.id}\n${sub.startTime} --> ${sub.endTime}\n${sub.text}`;
  }).join('\n\n');
};
