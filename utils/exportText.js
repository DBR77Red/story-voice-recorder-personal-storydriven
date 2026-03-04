import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Write `text` to a temporary .txt file named `filename` and open the
 * platform share sheet so the user can save or send it.
 */
export async function exportStoryText(text, filename) {
  const sanitized = filename.replace(/[^\w\s\-_.]/g, '_').trim() || 'story';
  const fileUri = FileSystem.documentDirectory + sanitized + '.txt';

  await FileSystem.writeAsStringAsync(fileUri, text, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/plain',
    dialogTitle: 'Save your story',
    UTI: 'public.plain-text',
  });
}

/** Generate the default filename: story_YYYY-MM-DD_HHhmm */
export function getDefaultFilename() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  const hh   = String(now.getHours()).padStart(2, '0');
  const min  = String(now.getMinutes()).padStart(2, '0');
  return `story_${yyyy}-${mm}-${dd}_${hh}h${min}`;
}
