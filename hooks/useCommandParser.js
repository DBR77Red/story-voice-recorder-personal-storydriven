// Voice-command substitutions applied to finalized Deepgram transcripts.
// Matching is word-boundary, case-insensitive.

const SUBSTITUTIONS = [
  { pattern: /\bperiod\b/gi, replacement: '.' },
  { pattern: /\bcomma\b/gi, replacement: ',' },
  { pattern: /\bparagraph\b/gi, replacement: '\n\n' },
];

const DELETE_PATTERN = /\bdelete ( the)? last sentence\b/i;

/** Replace spoken punctuation words in a transcript fragment. */
export function parseCommands(text) {
  let result = text;
  for (const { pattern, replacement } of SUBSTITUTIONS) {
    result = result.replace(pattern, replacement);
  }
  return result.trim();
}

/** Return true if the transcript contains the delete-sentence command. */
export function hasDeleteCommand(text) {
  return DELETE_PATTERN.test(text);
}

/**
 * Remove the last sentence from accumulated story text.
 * A sentence ends at . ! or ? followed by optional whitespace.
 */
export function deleteLastSentence(text) {
  const trimmed = text.trimEnd();
  // Find the last sentence boundary before the final sentence
  const match = trimmed.match(/^([\s\S]*[.!?])[\s\S]*$/);
  if (match) {
    return match[1].trimEnd();
  }
  // No prior sentence — clear everything
  return '';
}
