import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Each meal photo is stored as two JPEGs in <documents>/photos:
//   <name>.jpg        max 1280 px on the long edge
//   <name>_thumb.jpg  max 256 px, used in the meal list
// Only <name> is saved in the database so paths survive app-container moves.

const FULL_EDGE = 1280;
const THUMB_EDGE = 256;

function photosDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ idempotent: true });
  return dir;
}

function fullFile(name: string) {
  return new File(photosDir(), `${name}.jpg`);
}

function thumbFile(name: string) {
  return new File(photosDir(), `${name}_thumb.jpg`);
}

export const photoUri = (name: string) => fullFile(name).uri;
export const thumbUri = (name: string) => thumbFile(name).uri;

async function resizeTo(srcUri: string, width: number, height: number, edge: number, dest: File) {
  const size = width >= height ? { width: Math.min(edge, width) } : { height: Math.min(edge, height) };
  const image = await ImageManipulator.manipulate(srcUri).resize(size).renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  await new File(result.uri).move(dest);
}

/** Resizes a picked image into app storage and returns its stored name. */
export async function savePhoto(srcUri: string, width: number, height: number): Promise<string> {
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await resizeTo(srcUri, width, height, FULL_EDGE, fullFile(name));
    await resizeTo(srcUri, width, height, THUMB_EDGE, thumbFile(name));
  } catch (e) {
    deletePhoto(name);
    throw e;
  }
  return name;
}

export function deletePhoto(name: string) {
  for (const f of [fullFile(name), thumbFile(name)]) {
    if (f.exists) f.delete();
  }
}
