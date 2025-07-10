export interface RoomData {
  id: string;
  name: string;
  users: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FileData {
  id: string;
  name: string;
  content: string;
  language: string;
  roomId: string;
  folderId?: string | null;
  createdBy: string;
  lastEditedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderData {
  id: string;
  name: string;
  roomId: string;
  parentFolderId?: string | null; 
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TypingUser {
  userId: string;
  fileId: string;
  isTyping: boolean;
}

export interface UserCursor {
  userId: string;
  fileId: string;
  position: number;
}

export interface FileTreeItem {
  type: 'file' | 'folder';
  data: FileData | FolderData;
  children?: FileTreeItem[];
  isExpanded?: boolean;
}

export const supportedLanguages = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'xml', label: 'XML' },
  { value: 'sql', label: 'SQL' },
  { value: 'yaml', label: 'YAML' },
  { value: 'plaintext', label: 'Plain Text' }
];
