import { LitElement, html, css, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { ChevronUp, ChevronDown, Copy, Check, Pencil } from 'lucide-static';
import { theme } from '../styles/theme.js';

export interface DataTableColumn {
    key: string;
    label: string;
    width?: string;
    sortable?: boolean;
    editable?: boolean | 'text' | 'checkbox';
    copyable?: boolean;
    mono?: boolean;
    render?: (value: unknown, row: Record<string, unknown>) => TemplateResult | string;
}

@customElement('zt-data-table')
export class ZtDataTable extends LitElement {
    @property({ type: Array }) columns: DataTableColumn[] = [];
    @property({ type: Array }) rows: Record<string, unknown>[] = [];
    @property({ type: Boolean }) selectable = false;
    @property({ type: String }) emptyIcon = '';
    @property({ type: String }) emptyMessage = 'No data';

    @state() private sortKey: string | null = null;
    @state() private sortDir: 'asc' | 'desc' | null = null;
    @state() private selectedRows: Set<number> = new Set();
    @state() private editingCell: { row: number; key: string } | null = null;
    @state() private copiedCell: { row: number; key: string } | null = null;

    static styles = [
        theme,
        css`
            :host { display: block; }

            .table-wrapper { overflow-x: auto; }

            table { width: 100%; border-collapse: collapse; }

            th {
                font-size: var(--font-size-xs);
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                color: var(--color-text-muted);
                padding: var(--space-sm, 8px);
                text-align: left;
                border-bottom: 1px solid var(--color-border);
                white-space: nowrap;
                user-select: none;
            }

            th.sortable { cursor: pointer; }
            th.sortable:hover { color: var(--color-text-secondary); }
            th.sorted { color: var(--color-text-primary); }

            .sort-icon {
                width: 12px;
                height: 12px;
                display: inline-flex;
                vertical-align: middle;
                margin-left: 4px;
            }

            .sort-icon svg { width: 100%; height: 100%; }

            td {
                font-size: var(--font-size-base);
                color: var(--color-text-primary);
                padding: var(--space-sm, 8px);
                border-bottom: 1px solid var(--color-border);
                vertical-align: middle;
            }

            td.mono {
                font-family: var(--font-mono);
                font-size: var(--font-size-sm);
            }

            tr:hover { background: var(--color-bg-tertiary); }

            .checkbox-cell { width: 40px; text-align: center; }

            .edit-input {
                width: 100%;
                padding: 4px 8px;
                border: 1px solid var(--color-accent);
                border-radius: var(--radius-sm);
                background: var(--color-bg-primary);
                color: var(--color-text-primary);
                font-family: var(--font-family);
                font-size: var(--font-size-base);
                outline: none;
            }

            .cell-actions {
                display: inline-flex;
                gap: 4px;
                margin-left: 4px;
                vertical-align: middle;
                opacity: 0;
                transition: opacity var(--transition-fast);
            }

            tr:hover .cell-actions { opacity: 1; }

            .copy-btn, .edit-btn {
                background: none;
                border: none;
                color: var(--color-text-muted);
                cursor: pointer;
                padding: 2px;
                display: inline-flex;
                align-items: center;
                border-radius: var(--radius-sm);
            }

            .copy-btn:hover, .edit-btn:hover {
                color: var(--color-text-primary);
                background: var(--color-bg-hover);
            }

            .copy-btn svg, .edit-btn svg { width: 14px; height: 14px; }

            .copy-btn.copied { color: var(--color-success); }
        `,
    ];

    get sortedRows(): Record<string, unknown>[] {
        if (!this.sortKey || !this.sortDir) return this.rows;
        const key = this.sortKey;
        const dir = this.sortDir === 'asc' ? 1 : -1;
        return [...this.rows].sort((a, b) => {
            const va = a[key];
            const vb = b[key];
            if (va == null && vb == null) return 0;
            if (va == null) return dir;
            if (vb == null) return -dir;
            if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
            return String(va).localeCompare(String(vb)) * dir;
        });
    }

    private handleSort(key: string): void {
        if (this.sortKey === key) {
            if (this.sortDir === 'asc') this.sortDir = 'desc';
            else if (this.sortDir === 'desc') { this.sortDir = null; this.sortKey = null; }
        } else {
            this.sortKey = key;
            this.sortDir = 'asc';
        }
        this.dispatchEvent(new CustomEvent('sort-change', {
            detail: { key: this.sortKey, direction: this.sortDir },
            bubbles: true, composed: true,
        }));
    }

    private handleSelectAll(e: Event): void {
        const checked = (e.target as HTMLInputElement).checked;
        if (checked) {
            this.selectedRows = new Set(this.sortedRows.map((_, i) => i));
        } else {
            this.selectedRows = new Set();
        }
        this.dispatchSelectedRows();
    }

    private handleSelectRow(index: number, e: Event): void {
        const checked = (e.target as HTMLInputElement).checked;
        const newSet = new Set(this.selectedRows);
        if (checked) newSet.add(index); else newSet.delete(index);
        this.selectedRows = newSet;
        this.dispatchSelectedRows();
    }

    private dispatchSelectedRows(): void {
        const selected = [...this.selectedRows].map(i => this.sortedRows[i]);
        this.dispatchEvent(new CustomEvent('row-select', {
            detail: { selectedRows: selected },
            bubbles: true, composed: true,
        }));
    }

    private handleEditStart(rowIndex: number, key: string): void {
        this.editingCell = { row: rowIndex, key };
    }

    private handleEditSave(rowIndex: number, key: string, value: unknown): void {
        this.editingCell = null;
        this.dispatchEvent(new CustomEvent('cell-edit', {
            detail: { key, rowIndex, value, row: this.sortedRows[rowIndex] },
            bubbles: true, composed: true,
        }));
    }

    private handleEditCancel(): void {
        this.editingCell = null;
    }

    private async handleCopy(rowIndex: number, key: string, value: string): Promise<void> {
        await navigator.clipboard.writeText(value);
        this.copiedCell = { row: rowIndex, key };
        setTimeout(() => { this.copiedCell = null; }, 1500);
    }

    private renderCopyBtn(rowIndex: number, col: DataTableColumn, value: string, isCopied: boolean): TemplateResult {
        return html`<button class="copy-btn cell-actions ${isCopied ? 'copied' : ''}" aria-label="Copy ${col.label || 'cell'} value" @click=${() => this.handleCopy(rowIndex, col.key, value)} title="Copy">${unsafeSVG(isCopied ? Check : Copy)}</button>`;
    }

    private renderCell(row: Record<string, unknown>, col: DataTableColumn, rowIndex: number): TemplateResult {
        const value = row[col.key];
        const isEditing = this.editingCell?.row === rowIndex && this.editingCell?.key === col.key;
        const isCopied = this.copiedCell?.row === rowIndex && this.copiedCell?.key === col.key;

        if (col.render && !isEditing) {
            return html`<td class="${col.mono ? 'mono' : ''}" style="${col.width ? `width: ${col.width}` : ''}">${col.render(value, row)}${col.copyable ? this.renderCopyBtn(rowIndex, col, String(value ?? ''), isCopied) : nothing}</td>`;
        }

        if (col.editable === 'checkbox') {
            return html`<td style="${col.width ? `width: ${col.width}` : ''}"><input type="checkbox" .checked=${Boolean(value)} @change=${(e: Event) => this.handleEditSave(rowIndex, col.key, (e.target as HTMLInputElement).checked)} /></td>`;
        }

        if (isEditing && col.editable) {
            return html`<td style="${col.width ? `width: ${col.width}` : ''}"><input class="edit-input" .value=${String(value ?? '')} @blur=${(e: FocusEvent) => this.handleEditSave(rowIndex, col.key, (e.target as HTMLInputElement).value)} @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') this.handleEditCancel(); }} /></td>`;
        }

        return html`<td class="${col.mono ? 'mono' : ''}" style="${col.width ? `width: ${col.width}` : ''}">
            <span @click=${col.editable === 'text' || col.editable === true ? () => this.handleEditStart(rowIndex, col.key) : null}>${value ?? '—'}</span>
            ${col.editable === 'text' || col.editable === true ? html`<button class="edit-btn cell-actions" aria-label="Edit ${col.label || 'cell'}" @click=${() => this.handleEditStart(rowIndex, col.key)}>${unsafeSVG(Pencil)}</button>` : nothing}
            ${col.copyable ? this.renderCopyBtn(rowIndex, col, String(value ?? ''), isCopied) : nothing}
        </td>`;
    }

    private renderRow(row: Record<string, unknown>, index: number): TemplateResult {
        return html`
            <tr>
                ${this.selectable ? html`<td class="checkbox-cell"><input type="checkbox" .checked=${this.selectedRows.has(index)} @change=${(e: Event) => this.handleSelectRow(index, e)} /></td>` : nothing}
                ${this.columns.map(col => this.renderCell(row, col, index))}
            </tr>
        `;
    }

    render() {
        return html`
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            ${this.selectable ? html`<th class="checkbox-cell"><input type="checkbox" @change=${this.handleSelectAll} .checked=${this.selectedRows.size === this.sortedRows.length && this.sortedRows.length > 0} /></th>` : nothing}
                            ${this.columns.map(col => html`
                                <th
                                    class="${col.sortable ? 'sortable' : ''} ${this.sortKey === col.key ? 'sorted' : ''}"
                                    style="${col.width ? `width: ${col.width}` : ''}"
                                    @click=${() => col.sortable ? this.handleSort(col.key) : null}
                                >
                                    ${col.label}
                                    ${this.sortKey === col.key && this.sortDir ? html`<span class="sort-icon">${unsafeSVG(this.sortDir === 'asc' ? ChevronUp : ChevronDown)}</span>` : nothing}
                                </th>
                            `)}
                        </tr>
                    </thead>
                    <tbody>
                        ${this.sortedRows.length === 0
                            ? html`<tr><td colspan="${this.columns.length + (this.selectable ? 1 : 0)}" style="text-align:center; padding: 2rem; color: var(--color-text-muted);">${this.emptyMessage}</td></tr>`
                            : this.sortedRows.map((row, i) => this.renderRow(row, i))
                        }
                    </tbody>
                </table>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'zt-data-table': ZtDataTable;
    }
}
