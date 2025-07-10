import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { FileData, FolderData } from '../types/room.types';


function addFolderToZip(zip: any, folder: FolderData, folders: FolderData[], files: FileData[]) {
  const folderZip = zip.folder(folder.name);
  files.filter((f: FileData) => f.folderId === folder.id).forEach((file: FileData) => {
    folderZip.file(file.name, file.content);
  });
  folders.filter((f: FolderData) => f.parentFolderId === folder.id).forEach((subFolder: FolderData) => {
    addFolderToZip(folderZip, subFolder, folders, files);
  });
}

export async function exportProjectAsZip(folders: FolderData[], files: FileData[]) {
  const zip = new JSZip();
  files.filter((f: FileData) => !f.folderId).forEach((file: FileData) => {
    zip.file(file.name, file.content);
  });
  folders.filter((f: FolderData) => !f.parentFolderId).forEach((folder: FolderData) => {
    addFolderToZip(zip, folder, folders, files);
  });
  const blob = await zip.generateAsync({ type: 'blob' });

  // @ts-ignore
  if (window.showSaveFilePicker) {
    try {
      // @ts-ignore
      const handle = await window.showSaveFilePicker({
        suggestedName: 'project.zip',
        types: [
          {
            description: 'ZIP archive',
            accept: { 'application/zip': ['.zip'] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e) {
    }
  }
  saveAs(blob, 'project.zip');
}
