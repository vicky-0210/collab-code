import { ArrowPathIcon } from "@heroicons/react/24/outline";
import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import type { FileData, TypingUser } from '../types/room.types';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface CodeEditorProps {
  activeFile: FileData | null;
  fileContent: string;
  typingUsers: TypingUser[];
  isTyping: boolean;
  isSaved: boolean;
  isReceivingUpdate: boolean;
  onContentChange: (content: string) => void;
  onCursorMove?: () => void;
  readOnly?: boolean;
  allFiles?: FileData[];
  getFileContentById?: (id: string) => string;
  socket?: any; 
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  activeFile,
  fileContent,
  typingUsers,
  isTyping,
  isSaved,
  isReceivingUpdate,
  onContentChange,
  onCursorMove,
  readOnly,
  allFiles = [],
  getFileContentById,
  socket
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const isInternalUpdateRef = useRef(false);
  const currentFileIdRef = useRef<string | null>(null);
  const editorInitializedRef = useRef(false);
  const lastUpdateContentRef = useRef<string>('');
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmittedContentRef = useRef<string>('');

  const currentFileTypingUsers = useMemo(() =>
    typingUsers.filter(user =>
      activeFile && user.fileId === activeFile.id && user.isTyping
    ), [typingUsers, activeFile?.id]
  );

  const normalizedLanguage = useMemo(() => {
    if (!activeFile?.language) return 'javascript';
    return normalizeMonacoLanguage(activeFile.language);
  }, [activeFile?.language]);

  const canPreview = useMemo(() => {
    return !!(activeFile && normalizedLanguage === 'html');
  }, [activeFile?.id, normalizedLanguage]);

  const emitContentChange = useCallback((content: string) => {
    if (!socket || !activeFile?.id) return;

    if (lastEmittedContentRef.current === content) return;

    lastEmittedContentRef.current = content;

    console.log('[CodeEditor] Emitting real-time content change:', {
      fileId: activeFile.id,
      contentLength: content.length
    });

    const changeData = {
      fileId: activeFile.id,
      content,
      userId: socket.id,
      timestamp: Date.now()
    };

    socket.emit('fileContentChange', {
      roomId: activeFile.roomId,
      ...changeData
    });
  }, [socket, activeFile?.id, activeFile?.roomId]);

  const debouncedEmitContentChange = useCallback((content: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      emitContentChange(content);
    }, 300); 
  }, [emitContentChange]);

  const getMultiFilePreviewHtml = useCallback(() => {
    if (!activeFile || normalizedLanguage !== 'html') return '';

    let htmlFile = null, cssFile = null, jsFile = null;

    for (const file of allFiles) {
      const fLang = normalizeMonacoLanguage(file.language);
      if (fLang === 'html' && (!htmlFile || file.id === activeFile.id)) {
        htmlFile = file;
      }
      if (fLang === 'css' && !cssFile) {
        cssFile = file;
      }
      if (fLang === 'javascript' && !jsFile) {
        jsFile = file;
      }
    }

    const getFileContent = (file: FileData | null) => {
      if (!file) return '';
      if (file.id === activeFile.id) return fileContent;
      return getFileContentById ? getFileContentById(file.id) : file.content || '';
    };

    const html = getFileContent(htmlFile);
    const css = getFileContent(cssFile);
    const js = getFileContent(jsFile);

    let htmlBody = html;
    if (htmlBody) {
      htmlBody = htmlBody.replace(/<link[^>]*rel\s*=\s*["']stylesheet["'][^>]*>/gi, '');
      htmlBody = htmlBody.replace(/<script[^>]*src\s*=[^>]*><\/script>/gi, '');
    }

    const styleTag = css ? `<style>${css}</style>` : '';
    const scriptTag = js ? `<script>(function(){try{${js}\n}catch(e){console.error('Preview script error:', e);}})();</script>` : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${styleTag}
</head>
<body>
  ${htmlBody}
  ${scriptTag}
</body>
</html>`;
  }, [activeFile?.id, fileContent, allFiles, getFileContentById, normalizedLanguage]);

  const previewHtml = useMemo(() => getMultiFilePreviewHtml(), [getMultiFilePreviewHtml]);

  const handleContentChange = useCallback((value: string | undefined) => {
    if (isInternalUpdateRef.current) {
      console.log('[CodeEditor] Ignoring content change - internal update in progress');
      return;
    }

    const newContent = value ?? '';

    if (activeFile?.id) {
      console.log('[CodeEditor] User content change:', {
        fileId: activeFile.id,
        contentLength: newContent.length,
        isReceivingUpdate
      });

      onContentChange(newContent);

      if (!isReceivingUpdate) {
        debouncedEmitContentChange(newContent);
      }
    }
  }, [onContentChange, activeFile?.id, isReceivingUpdate, debouncedEmitContentChange]);

  const handleEditorMount = useCallback((editorInstance: editor.IStandaloneCodeEditor) => {
    console.log('[CodeEditor] Editor mounted');
    editorRef.current = editorInstance;
    editorInitializedRef.current = true;

    if (activeFile?.id && fileContent !== undefined) {
      console.log('[CodeEditor] Setting initial content on mount:', {
        fileId: activeFile.id,
        contentLength: fileContent.length
      });
      isInternalUpdateRef.current = true;
      editorInstance.setValue(fileContent);
      currentFileIdRef.current = activeFile.id;
      lastUpdateContentRef.current = fileContent;
      lastEmittedContentRef.current = fileContent;
      setTimeout(() => {
        isInternalUpdateRef.current = false;
      }, 0);
    }

    if (onCursorMove) {
      editorInstance.onDidChangeCursorPosition(onCursorMove);
    }
  }, [activeFile?.id, fileContent, onCursorMove]);

  useEffect(() => {
    if (!editorRef.current || !editorInitializedRef.current || !activeFile?.id) return;

    const hasFileChanged = currentFileIdRef.current !== activeFile.id;
    const shouldUpdateForRealtime = isReceivingUpdate && currentFileIdRef.current === activeFile.id;
    const hasContentChanged = lastUpdateContentRef.current !== fileContent;

    console.log('[CodeEditor] Content update effect:', {
      hasFileChanged,
      shouldUpdateForRealtime,
      hasContentChanged,
      isReceivingUpdate,
      currentFileId: currentFileIdRef.current,
      activeFileId: activeFile.id,
      lastContentLength: lastUpdateContentRef.current?.length || 0,
      newContentLength: fileContent?.length || 0
    });

    if (hasFileChanged || (shouldUpdateForRealtime && hasContentChanged)) {
      const currentValue = editorRef.current.getValue();

      console.log('[CodeEditor] Applying content update:', {
        currentValueLength: currentValue?.length || 0,
        newContentLength: fileContent?.length || 0,
        reason: hasFileChanged ? 'file-changed' : 'real-time-update'
      });

      isInternalUpdateRef.current = true;

      if (hasFileChanged) {
        console.log('[CodeEditor] File switched - updating content');
        editorRef.current.setValue(fileContent);
        currentFileIdRef.current = activeFile.id;
        lastUpdateContentRef.current = fileContent;
        lastEmittedContentRef.current = fileContent;
        editorRef.current.setPosition({ lineNumber: 1, column: 1 });
      } else if (shouldUpdateForRealtime && hasContentChanged) {
        console.log('[CodeEditor] Real-time update - preserving cursor');
        const position = editorRef.current.getPosition();
        const selection = editorRef.current.getSelection();

        editorRef.current.setValue(fileContent);
        lastUpdateContentRef.current = fileContent;
        lastEmittedContentRef.current = fileContent;

        if (position) {
          setTimeout(() => {
            if (editorRef.current) {
              editorRef.current.setPosition(position);
              if (selection) {
                editorRef.current.setSelection(selection);
              }
            }
          }, 0);
        }
      }

      setTimeout(() => {
        isInternalUpdateRef.current = false;
      }, 0);
    } else if (hasFileChanged && !hasContentChanged) {
      console.log('[CodeEditor] File changed but content same - updating refs');
      currentFileIdRef.current = activeFile.id;
      lastUpdateContentRef.current = fileContent;
      lastEmittedContentRef.current = fileContent;
    }
  }, [activeFile?.id, fileContent, isReceivingUpdate]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isReceivingUpdate) {
      lastEmittedContentRef.current = fileContent;
    }
  }, [isReceivingUpdate, fileContent]);

  const editorKey = useMemo(() => {
    return `editor-${activeFile?.id || 'no-file'}`;
  }, [activeFile?.id]);

  useEffect(() => {
    console.log('[CodeEditor] isReceivingUpdate changed:', isReceivingUpdate);
  }, [isReceivingUpdate]);

  if (!activeFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#1a1b26]">
        <div className="text-center">
          <h3 className="text-[#c0caf5] text-xl mb-2">No file selected</h3>
          <p className="text-[#a9b1d6] mb-4">Create a new file or select an existing one to start coding</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      
      <div className="bg-[#2a2e43] p-3 border-b border-[#3b4261]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[#c0caf5] font-medium">{activeFile.name}</h3>
            <div className="text-[#a9b1d6] text-sm flex items-center space-x-2">
              <span>{normalizedLanguage}</span>
              <span>•</span>
              <span className={`${isSaved ? 'text-green-400' : 'text-yellow-400'}`}>
                {isTyping ? 'Typing...' : isSaved ? 'Saved' : 'Unsaved changes'}
              </span>

              {currentFileTypingUsers.length > 0 && (
                <>
                  <span>•</span>
                  <span className="text-blue-400">
                    {currentFileTypingUsers.length} other{currentFileTypingUsers.length !== 1 ? 's' : ''} typing
                  </span>
                </>
              )}
            </div>
          </div>
          
          {canPreview && (
            <button
              className={`ml-4 px-4 py-1 rounded transition-colors ${showPreview
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          )}
        </div>
      </div>

      
      <div className="flex-1 flex min-h-0">
        
        <div className={showPreview ? "w-1/2 min-w-[300px] border-r border-[#3b4261]" : "w-full"}>
          <Editor
            key={editorKey}
            height="100%"
            language={normalizedLanguage}
            defaultValue={fileContent}
            onChange={handleContentChange}
            onMount={handleEditorMount}
            options={{
              readOnly: !!readOnly,
              fontSize: 14,
              minimap: { enabled: false },
              theme: 'vs-dark',
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              validate: true,
              glyphMargin: true,
              folding: true,
              lineNumbers: 'on',
              rulers: [],
              overviewRulerLanes: 2,
              scrollbar: {
                useShadows: false,
                vertical: 'auto',
                horizontal: 'auto',
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10
              },
              find: {
                addExtraSpaceOnTop: false,
                autoFindInSelection: 'never',
                seedSearchStringFromSelection: 'never'
              }
            }}
          />
          
          {(currentFileTypingUsers.length > 0 || isReceivingUpdate) && (
            <div className="absolute bottom-4 right-4 bg-[#24283b] px-3 py-1 rounded-lg border border-[#3b4261] z-10">
              <div className="text-xs text-[#a9b1d6] space-y-1">
                {currentFileTypingUsers.length > 0 && (
                  <div>
                    {currentFileTypingUsers.map((user, index) => (
                      <span key={user.userId}>
                        User {user.userId.slice(-4)} is typing
                        {index < currentFileTypingUsers.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                )}
                {isReceivingUpdate && (
                  <div className="flex items-center text-[#ff9e64]">
                    <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        
        {showPreview && (
          <div className="w-1/2 min-w-[300px] bg-[#1a1b26] flex flex-col relative">
            <div className="bg-[#23263a] px-3 py-2 border-b border-[#3b4261] text-[#c0caf5] text-sm font-medium flex items-center justify-between">
              <span>Live Preview</span>
              <button
                className="ml-2 px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 text-xs transition-colors"
                onClick={() => setShowPreview(false)}
              >
                ×
              </button>
            </div>
            <iframe
              title="Live Preview"
              srcDoc={previewHtml}
              sandbox="allow-scripts allow-same-origin allow-forms"
              className="flex-1 w-full h-full border-0 bg-white"
              style={{ minHeight: 0 }}
            />
          </div>
        )}
      </div>
    </div>
  );
};


function normalizeMonacoLanguage(lang?: string): string {
  if (!lang) return 'javascript';

  const l = lang.toLowerCase().trim();

  
  switch (l) {
    case 'js':
    case 'javascript':
      return 'javascript';
    case 'ts':
    case 'typescript':
      return 'typescript';
    case 'htm':
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'py':
    case 'python':
      return 'python';
    case 'c++':
    case 'cpp':
    case 'cxx':
      return 'cpp';
    case 'c':
      return 'c';
    case 'java':
      return 'java';
    case 'json':
      return 'json';
    case 'xml':
      return 'xml';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'php':
      return 'php';
    case 'rb':
    case 'ruby':
      return 'ruby';
    case 'go':
      return 'go';
    case 'rs':
    case 'rust':
      return 'rust';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'yml':
    case 'yaml':
      return 'yaml';
    case 'sql':
      return 'sql';
    default:
      return l;
  }
}