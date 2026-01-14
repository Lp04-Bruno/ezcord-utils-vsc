import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface TodoItem {
    file: string;
    line: number;
    column: number;
    text: string;
    commentStyle: string;
    fullPath: string;
}

const COMMENT_PATTERNS = {
    '//': ['java', 'kotlin', 'javascript', 'typescript', 'cpp', 'css', 'csharp', 'go', 'rust'],
    '#': ['python', 'shell', 'yaml', 'ruby', 'dockerfile', 'makefile', 'perl'],
    '<!--': ['html', 'xml'],
    '--': ['lua', 'sql'],
};

export class TodoProvider {
    private todos: TodoItem[] = [];
    private workspaceRoot: string | undefined;

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    async scanWorkspace(): Promise<TodoItem[]> {
        this.todos = [];
        
        if (!this.workspaceRoot) {
            return this.todos;
        }

        const files = await this.getAllFiles(this.workspaceRoot);
        
        for (const file of files) {
            await this.scanFile(file);
        }

        return this.todos;
    }

    async scanFile(filePath: string): Promise<void> {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            const language = this.getLanguageFromFile(filePath);

            lines.forEach((line, index) => {
                const todoMatch = this.extractTodo(line, language);
                if (todoMatch) {
                    this.todos.push({
                        file: path.basename(filePath),
                        line: index + 1,
                        column: todoMatch.column,
                        text: todoMatch.text,
                        commentStyle: todoMatch.commentStyle,
                        fullPath: filePath,
                    });
                }
            });
        } catch (error) {
            // Skip files that can't be read
        }
    }

    private extractTodo(line: string, language: string): { text: string; column: number; commentStyle: string } | null {
        const trimmed = line.trim();

        // Check // comments
        if (['java', 'kotlin', 'javascript', 'typescript', 'cpp', 'css', 'csharp', 'go', 'rust'].includes(language)) {
            const match = trimmed.match(/\/\/\s*(TODO|FIXME|BUG|HACK)[\s:]*(.*)/i);
            if (match) {
                return {
                    text: match[2].trim(),
                    column: line.indexOf(match[0]),
                    commentStyle: '//',
                };
            }
        }

        // Check # comments
        if (['python', 'shell', 'yaml', 'ruby', 'dockerfile', 'makefile', 'perl'].includes(language)) {
            const match = trimmed.match(/#\s*(TODO|FIXME|BUG|HACK)[\s:]*(.*)/i);
            if (match) {
                return {
                    text: match[2].trim(),
                    column: line.indexOf(match[0]),
                    commentStyle: '#',
                };
            }
        }

        // Check <!-- comments (HTML, XML)
        if (['html', 'xml'].includes(language)) {
            const match = trimmed.match(/<!--\s*(TODO|FIXME|BUG|HACK)[\s:]*(.*?)-->/i);
            if (match) {
                return {
                    text: match[2].trim(),
                    column: line.indexOf(match[0]),
                    commentStyle: '<!--',
                };
            }
        }

        // Check -- comments (Lua, SQL)
        if (['lua', 'sql'].includes(language)) {
            const match = trimmed.match(/--\s*(TODO|FIXME|BUG|HACK)[\s:]*(.*)/i);
            if (match) {
                return {
                    text: match[2].trim(),
                    column: line.indexOf(match[0]),
                    commentStyle: '--',
                };
            }
        }

        return null;
    }

    private getLanguageFromFile(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase().slice(1);
        const languageMap: { [key: string]: string } = {
            java: 'java',
            kt: 'kotlin',
            js: 'javascript',
            ts: 'typescript',
            jsx: 'javascript',
            tsx: 'typescript',
            cpp: 'cpp',
            cc: 'cpp',
            cxx: 'cpp',
            css: 'css',
            py: 'python',
            sh: 'shell',
            yml: 'yaml',
            yaml: 'yaml',
            rb: 'ruby',
            html: 'html',
            htm: 'html',
            xml: 'xml',
            cs: 'csharp',
            go: 'go',
            rs: 'rust',
            lua: 'lua',
            sql: 'sql',
            dockerfile: 'dockerfile',
            makefile: 'makefile',
            pl: 'perl',
        };
        return languageMap[ext] || '';
    }

    private async getAllFiles(dir: string): Promise<string[]> {
        let files: string[] = [];
        const excludeDirs = [
            'node_modules',
            '.git',
            'dist',
            'out',
            'build',
            '.vscode',
            '.idea',
            'target',
            'bin',
            'obj',
        ];

        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    if (!excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
                        files = files.concat(await this.getAllFiles(fullPath));
                    }
                } else if (entry.isFile()) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            // Skip directories that can't be read
        }

        return files;
    }

    getTodos(): TodoItem[] {
        return this.todos;
    }

    getTodosByFile(file: string): TodoItem[] {
        return this.todos.filter(t => t.file === file);
    }
}
