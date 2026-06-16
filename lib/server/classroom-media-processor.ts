import { extractMediaFromClassroom, replaceMediaUrlsInClassroom } from './media-extractor';
import { uploadClassroomData, uploadMediaFile } from './blob-storage';

export interface ProcessResult {
  dataUrl: string;
  mediaMap: Record<string, string>;
  processedData: any;
}

export async function processClassroomMedia(
  classroomId: string,
  data: any
): Promise<ProcessResult> {
  if (!data || !data.scenes) {
    console.log('[ClassroomMediaProcessor] No scenes data provided, skipping media processing');
    const dataUrl = await uploadClassroomData(classroomId, data || {});
    return {
      dataUrl,
      mediaMap: {},
      processedData: data || {},
    };
  }

  console.log('[ClassroomMediaProcessor] Starting media processing for classroom:', classroomId);

  const newData = JSON.parse(JSON.stringify(data));

  const mediaFiles = extractMediaFromClassroom(newData);
  console.log(`[ClassroomMediaProcessor] Found ${mediaFiles.length} media files to upload`);

  const mediaMap: Record<string, string> = {};
  if (mediaFiles.length > 0) {
    const uploadPromises = mediaFiles.map(async (media) => {
      try {
        const url = await uploadMediaFile(classroomId, media.filename, media.src);
        mediaMap[media.id] = url;
        console.log(`[ClassroomMediaProcessor] Uploaded media ${media.id} to ${url.substring(0, 50)}...`);
      } catch (error) {
        console.error(`[ClassroomMediaProcessor] Failed to upload media ${media.id}:`, error);
      }
    });

    await Promise.all(uploadPromises);
  }

  const finalData = replaceMediaUrlsInClassroom(newData, mediaMap);

  const dataUrl = await uploadClassroomData(classroomId, finalData);
  console.log(`[ClassroomMediaProcessor] Uploaded classroom data to Blob: ${dataUrl}`);

  return {
    dataUrl,
    mediaMap,
    processedData: finalData,
  };
}
