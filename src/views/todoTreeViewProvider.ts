import * as vscode from 'vscode';
import { TodoProvider, TodoItem } from '../providers/todoProvider';

export class TodoTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly todoItem?: TodoItem,
        public readonly children?: TodoTreeItem[]
    ) {
        super(label, collapsibleState);

        if (todoItem) {
            this.iconPath = new vscode.ThemeIcon('checklist');
            this.command = {
                command: 'ezcordUtils.openTodo',
                title: 'Open TODO',
                arguments: [todoItem],
            };
            this.description = `Line ${todoItem.line}`;
            this.tooltip = new vscode.MarkdownString(`**${todoItem.text}**\n\n${todoItem.fullPath}`);
        } else if (label === 'Loading...') {
            this.iconPath = new vscode.ThemeIcon('loading');
        } else {
            this.iconPath = new vscode.ThemeIcon('folder');
        }
    }
}

export class TodoTreeViewProvider implements vscode.TreeDataProvider<TodoTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TodoTreeItem | undefined | null | void> = new vscode.EventEmitter<
        TodoTreeItem | undefined | null | void
    >();
    readonly onDidChangeTreeData: vscode.Event<TodoTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private todoProvider: TodoProvider;
    private todos: TodoItem[] = [];
    private isLoading = false;

    constructor() {
        this.todoProvider = new TodoProvider();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    async scan(): Promise<void> {
        this.isLoading = true;
        this.refresh();

        try {
            this.todos = await this.todoProvider.scanWorkspace();
        } finally {
            this.isLoading = false;
            this.refresh();
        }
    }

    getTreeItem(element: TodoTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TodoTreeItem): Thenable<TodoTreeItem[]> {
        if (this.isLoading) {
            return Promise.resolve([new TodoTreeItem('Scanning workspace...', vscode.TreeItemCollapsibleState.None)]);
        }

        if (!element) {
            // Root level - group by file
            if (this.todos.length === 0) {
                return Promise.resolve([new TodoTreeItem('No TODOs found', vscode.TreeItemCollapsibleState.None)]);
            }

            const fileMap = new Map<string, TodoItem[]>();
            this.todos.forEach(todo => {
                const existing = fileMap.get(todo.file) || [];
                fileMap.set(todo.file, [...existing, todo]);
            });

            return Promise.resolve(
                Array.from(fileMap.entries()).map(
                    ([file, todos]) =>
                        new TodoTreeItem(
                            `${file} (${todos.length})`,
                            vscode.TreeItemCollapsibleState.Expanded,
                            undefined,
                            todos.map(todo => new TodoTreeItem(`${todo.text}`, vscode.TreeItemCollapsibleState.None, todo))
                        )
                )
            );
        }

        // If element has predefined children, return them
        return Promise.resolve(element.children || []);
    }
}
