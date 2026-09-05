
export const processTranscript = (text: string): string[] => {
  if (!text) return [];

  // 1. Normalize and remove ellipses
  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\.{3,}|…+|……/g, '');
  
  // Split by sentence endings or newlines to get "atoms"
  // We use a regex that keeps the delimiters
  const atoms = normalizedText.split(/([。！？.!?\n]+)/).filter(s => s.length > 0);
  
  // Re-combine delimiters with their preceding text
  const combinedAtoms: string[] = [];
  for (let i = 0; i < atoms.length; i++) {
    let atom = atoms[i];
    // If this is a delimiter and there's a previous atom, attach it
    if (/^[。！？.!?\n]+$/.test(atom) && combinedAtoms.length > 0) {
      combinedAtoms[combinedAtoms.length - 1] += atom;
    } else {
      combinedAtoms.push(atom);
    }
  }

  const TARGET_MIN = 200;
  const TARGET_MAX = 400;
  
  const results: string[] = [];
  let currentPart = "";

  for (const atom of combinedAtoms) {
    const trimmedAtom = atom.trim();
    if (!trimmedAtom) continue;

    // If adding this atom exceeds MAX, and we already have enough in MIN, push current
    if (currentPart.length + atom.length > TARGET_MAX && currentPart.length >= TARGET_MIN) {
      results.push(currentPart.trim());
      currentPart = atom;
    } 
    // If adding this atom exceeds MAX but we DON'T have enough in MIN, 
    // we have to split the atom or just push it if it's too big
    else if (currentPart.length + atom.length > TARGET_MAX) {
      if (currentPart.length > 0) {
        results.push(currentPart.trim());
        currentPart = "";
      }
      
      // If the atom itself is > MAX, we must split it
      if (atom.length > TARGET_MAX) {
        let remaining = atom;
        while (remaining.length > TARGET_MAX) {
          results.push(remaining.substring(0, TARGET_MAX).trim());
          remaining = remaining.substring(TARGET_MAX);
        }
        currentPart = remaining;
      } else {
        currentPart = atom;
      }
    }
    else {
      currentPart += atom;
    }
  }

  if (currentPart.trim()) {
    results.push(currentPart.trim());
  }

  return results;
};
