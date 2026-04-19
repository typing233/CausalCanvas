class CausalCanvasApp {
    constructor() {
        this.nodes = [];
        this.edges = [];
        this.extractedEntities = [];
        this.currentFilter = 'all';
        
        this.draggedTag = null;
        this.draggedNode = null;
        this.nodeOffset = { x: 0, y: 0 };
        
        this.isConnecting = false;
        this.connectionStart = null;
        this.tempLine = null;
        this.pendingEdge = null;
        
        this.nodeIdCounter = 0;
        this.edgeIdCounter = 0;
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.initSvgDefs();
        this.updateCounts();
    }
    
    cacheElements() {
        this.textInput = document.getElementById('textInput');
        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.extractedSection = document.getElementById('extractedSection');
        this.tagsContainer = document.getElementById('tagsContainer');
        this.filterTabs = document.querySelectorAll('.filter-tab');
        
        this.canvas = document.getElementById('canvas');
        this.nodesContainer = document.getElementById('nodesContainer');
        this.edgesSvg = document.getElementById('edgesSvg');
        
        this.nodeCountEl = document.getElementById('nodeCount');
        this.edgeCountEl = document.getElementById('edgeCount');
        this.clearCanvasBtn = document.getElementById('clearCanvasBtn');
        this.generateReportBtn = document.getElementById('generateReportBtn');
        
        this.relationSelector = document.getElementById('relationSelector');
        this.cancelRelationBtn = document.getElementById('cancelRelation');
        this.relationBtns = document.querySelectorAll('.relation-btn');
        
        this.reportSidebar = document.getElementById('reportSidebar');
        this.reportContent = document.getElementById('reportContent');
        this.copyReportBtn = document.getElementById('copyReportBtn');
        this.closeReportBtn = document.getElementById('closeReportBtn');
        
        this.toast = document.getElementById('toast');
    }
    
    bindEvents() {
        this.analyzeBtn.addEventListener('click', () => this.analyzeText());
        
        this.filterTabs.forEach(tab => {
            tab.addEventListener('click', () => this.setFilter(tab.dataset.type));
        });
        
        this.clearCanvasBtn.addEventListener('click', () => this.clearCanvas());
        this.generateReportBtn.addEventListener('click', () => this.generateReport());
        
        this.cancelRelationBtn.addEventListener('click', () => this.cancelConnection());
        this.relationBtns.forEach(btn => {
            btn.addEventListener('click', () => this.confirmRelation(btn.dataset.relation));
        });
        
        this.copyReportBtn.addEventListener('click', () => this.copyReport());
        this.closeReportBtn.addEventListener('click', () => this.closeReport());
        
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.draggedTag) {
                this.createNodeFromTag(e);
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.draggedNode) {
                this.moveNode(e);
            }
            if (this.isConnecting && this.tempLine) {
                this.updateTempLine(e);
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.draggedNode = null;
        });
        
        this.canvas.addEventListener('click', (e) => {
            if (e.target === this.canvas || e.target === this.nodesContainer) {
                this.deselectAllNodes();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                this.deleteSelected();
            }
            if (e.key === 'Escape') {
                this.cancelConnection();
                this.deselectAllNodes();
            }
        });
    }
    
    initSvgDefs() {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', '#6366f1');
        
        marker.appendChild(polygon);
        defs.appendChild(marker);
        this.edgesSvg.appendChild(defs);
    }
    
    async analyzeText() {
        const text = this.textInput.value.trim();
        if (!text) {
            this.showToast('请输入文本内容', 'error');
            return;
        }
        
        this.analyzeBtn.disabled = true;
        this.analyzeBtn.textContent = '🔍 解析中...';
        
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            
            if (!response.ok) {
                throw new Error('解析失败');
            }
            
            const result = await response.json();
            this.extractedEntities = result.entities;
            
            this.renderTags();
            this.extractedSection.style.display = 'block';
            this.showToast('解析完成！提取了 ' + this.extractedEntities.length + ' 个标签', 'success');
            
        } catch (error) {
            console.error('Error:', error);
            this.showToast('解析失败，请重试', 'error');
        } finally {
            this.analyzeBtn.disabled = false;
            this.analyzeBtn.textContent = '🔍 解析文本';
        }
    }
    
    renderTags() {
        this.tagsContainer.innerHTML = '';
        
        const filteredEntities = this.currentFilter === 'all' 
            ? this.extractedEntities 
            : this.extractedEntities.filter(e => e.type === this.currentFilter);
        
        if (filteredEntities.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.color = '#6b7280';
            emptyMsg.style.fontSize = '0.85rem';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.padding = '1rem';
            emptyMsg.textContent = '暂无相关标签';
            this.tagsContainer.appendChild(emptyMsg);
            return;
        }
        
        filteredEntities.forEach(entity => {
            const tag = document.createElement('span');
            tag.className = `tag tag-${entity.type}`;
            tag.textContent = entity.text;
            tag.dataset.text = entity.text;
            tag.dataset.type = entity.type;
            tag.draggable = true;
            
            tag.addEventListener('dragstart', (e) => {
                this.draggedTag = { text: entity.text, type: entity.type };
                e.dataTransfer.effectAllowed = 'copy';
            });
            
            tag.addEventListener('dragend', () => {
                this.draggedTag = null;
            });
            
            this.tagsContainer.appendChild(tag);
        });
    }
    
    setFilter(type) {
        this.currentFilter = type;
        this.filterTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });
        this.renderTags();
    }
    
    createNodeFromTag(e) {
        if (!this.draggedTag) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - 60;
        const y = e.clientY - rect.top - 20;
        
        const nodeId = `node-${++this.nodeIdCounter}`;
        const node = {
            id: nodeId,
            label: this.draggedTag.text,
            type: this.draggedTag.type,
            x: Math.max(0, x),
            y: Math.max(0, y),
            selected: false
        };
        
        this.nodes.push(node);
        this.renderNode(node);
        this.updateCounts();
    }
    
    renderNode(node) {
        const nodeEl = document.createElement('div');
        nodeEl.className = `node node-${node.type}`;
        nodeEl.id = node.id;
        nodeEl.style.left = `${node.x}px`;
        nodeEl.style.top = `${node.y}px`;
        nodeEl.textContent = node.label;
        
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'node-delete';
        deleteBtn.innerHTML = '×';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteNode(node.id);
        });
        nodeEl.appendChild(deleteBtn);
        
        const positions = ['top', 'right', 'bottom', 'left'];
        positions.forEach(pos => {
            const point = document.createElement('div');
            point.className = `node-connect-point ${pos}`;
            point.dataset.position = pos;
            
            point.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startConnection(node.id, pos, e);
            });
            
            point.addEventListener('mouseup', (e) => {
                e.stopPropagation();
                if (this.isConnecting && this.connectionStart.nodeId !== node.id) {
                    this.endConnection(node.id, pos);
                }
            });
            
            nodeEl.appendChild(point);
        });
        
        nodeEl.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('node-connect-point') || 
                e.target.classList.contains('node-delete')) {
                return;
            }
            
            if (!e.shiftKey) {
                this.deselectAllNodes();
            }
            
            this.selectNode(node.id);
            this.draggedNode = node;
            
            const rect = nodeEl.getBoundingClientRect();
            this.nodeOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            e.preventDefault();
        });
        
        this.nodesContainer.appendChild(nodeEl);
    }
    
    selectNode(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
            node.selected = true;
            const nodeEl = document.getElementById(nodeId);
            if (nodeEl) {
                nodeEl.classList.add('active');
            }
        }
    }
    
    deselectNode(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
            node.selected = false;
            const nodeEl = document.getElementById(nodeId);
            if (nodeEl) {
                nodeEl.classList.remove('active');
            }
        }
    }
    
    deselectAllNodes() {
        this.nodes.forEach(node => {
            node.selected = false;
            const nodeEl = document.getElementById(node.id);
            if (nodeEl) {
                nodeEl.classList.remove('active');
            }
        });
    }
    
    moveNode(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - this.nodeOffset.x;
        const y = e.clientY - rect.top - this.nodeOffset.y;
        
        this.draggedNode.x = Math.max(0, Math.min(x, rect.width - 100));
        this.draggedNode.y = Math.max(0, Math.min(y, rect.height - 50));
        
        const nodeEl = document.getElementById(this.draggedNode.id);
        if (nodeEl) {
            nodeEl.style.left = `${this.draggedNode.x}px`;
            nodeEl.style.top = `${this.draggedNode.y}px`;
        }
        
        this.updateEdges();
    }
    
    startConnection(nodeId, position, e) {
        this.isConnecting = true;
        this.connectionStart = { nodeId, position };
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.setAttribute('stroke', '#6366f1');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke-dasharray', '5,5');
        
        const startPoint = this.getNodeConnectionPoint(nodeId, position);
        const canvasRect = this.canvas.getBoundingClientRect();
        
        line.setAttribute('d', `M ${startPoint.x} ${startPoint.y} L ${startPoint.x} ${startPoint.y}`);
        
        this.edgesSvg.appendChild(line);
        this.tempLine = line;
    }
    
    updateTempLine(e) {
        if (!this.tempLine || !this.connectionStart) return;
        
        const canvasRect = this.canvas.getBoundingClientRect();
        const startPoint = this.getNodeConnectionPoint(this.connectionStart.nodeId, this.connectionStart.position);
        const endX = e.clientX - canvasRect.left;
        const endY = e.clientY - canvasRect.top;
        
        const path = this.createBezierPath(startPoint.x, startPoint.y, endX, endY, this.connectionStart.position, 'right');
        this.tempLine.setAttribute('d', path);
    }
    
    endConnection(targetNodeId, targetPosition) {
        if (!this.connectionStart || this.connectionStart.nodeId === targetNodeId) {
            this.cancelConnection();
            return;
        }
        
        this.pendingEdge = {
            source: this.connectionStart.nodeId,
            target: targetNodeId,
            sourcePosition: this.connectionStart.position,
            targetPosition: targetPosition
        };
        
        if (this.tempLine) {
            this.tempLine.remove();
            this.tempLine = null;
        }
        
        this.isConnecting = false;
        this.showRelationSelector();
    }
    
    cancelConnection() {
        this.isConnecting = false;
        this.connectionStart = null;
        this.pendingEdge = null;
        
        if (this.tempLine) {
            this.tempLine.remove();
            this.tempLine = null;
        }
        
        this.hideRelationSelector();
    }
    
    showRelationSelector() {
        this.relationSelector.style.display = 'block';
    }
    
    hideRelationSelector() {
        this.relationSelector.style.display = 'none';
    }
    
    confirmRelation(relation) {
        if (!this.pendingEdge) {
            this.hideRelationSelector();
            return;
        }
        
        const existingEdge = this.edges.find(e => 
            e.source === this.pendingEdge.source && 
            e.target === this.pendingEdge.target
        );
        
        if (existingEdge) {
            existingEdge.relation = relation;
            this.updateEdgeLabel(existingEdge);
        } else {
            const edgeId = `edge-${++this.edgeIdCounter}`;
            const edge = {
                id: edgeId,
                source: this.pendingEdge.source,
                target: this.pendingEdge.target,
                sourcePosition: this.pendingEdge.sourcePosition,
                targetPosition: this.pendingEdge.targetPosition,
                relation: relation
            };
            
            this.edges.push(edge);
            this.renderEdge(edge);
        }
        
        this.pendingEdge = null;
        this.hideRelationSelector();
        this.updateCounts();
        this.showToast(`已添加关系: ${relation}`, 'success');
    }
    
    getNodeConnectionPoint(nodeId, position) {
        const node = this.nodes.find(n => n.id === nodeId);
        const nodeEl = document.getElementById(nodeId);
        
        if (!node || !nodeEl) return { x: 0, y: 0 };
        
        const rect = nodeEl.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        let x, y;
        switch (position) {
            case 'left':
                x = node.x;
                y = node.y + height / 2;
                break;
            case 'right':
                x = node.x + width;
                y = node.y + height / 2;
                break;
            case 'top':
                x = node.x + width / 2;
                y = node.y;
                break;
            case 'bottom':
                x = node.x + width / 2;
                y = node.y + height;
                break;
        }
        
        return { x, y };
    }
    
    createBezierPath(x1, y1, x2, y2, startPos, endPos) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const controlPointOffset = Math.min(distance * 0.5, 100);
        
        let cp1x = x1, cp1y = y1;
        let cp2x = x2, cp2y = y2;
        
        if (startPos === 'right' || startPos === 'left') {
            cp1x = x1 + (startPos === 'right' ? controlPointOffset : -controlPointOffset);
        } else {
            cp1y = y1 + (startPos === 'bottom' ? controlPointOffset : -controlPointOffset);
        }
        
        if (endPos === 'right' || endPos === 'left') {
            cp2x = x2 + (endPos === 'right' ? controlPointOffset : -controlPointOffset);
        } else {
            cp2y = y2 + (endPos === 'bottom' ? controlPointOffset : -controlPointOffset);
        }
        
        return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
    }
    
    renderEdge(edge) {
        const startPoint = this.getNodeConnectionPoint(edge.source, edge.sourcePosition);
        const endPoint = this.getNodeConnectionPoint(edge.target, edge.targetPosition);
        
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.id = edge.id;
        g.setAttribute('data-source', edge.source);
        g.setAttribute('data-target', edge.target);
        
        const path = this.createBezierPath(
            startPoint.x, startPoint.y,
            endPoint.x, endPoint.y,
            edge.sourcePosition, edge.targetPosition
        );
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.setAttribute('d', path);
        line.setAttribute('class', 'edge-line');
        
        const midX = (startPoint.x + endPoint.x) / 2;
        const midY = (startPoint.y + endPoint.y) / 2;
        
        const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        labelBg.setAttribute('class', 'edge-label-bg');
        labelBg.setAttribute('x', midX - 25);
        labelBg.setAttribute('y', midY - 12);
        labelBg.setAttribute('width', '50');
        labelBg.setAttribute('height', '20');
        labelBg.setAttribute('rx', '4');
        
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('class', 'edge-label');
        label.setAttribute('x', midX);
        label.setAttribute('y', midY + 5);
        label.textContent = edge.relation;
        
        label.addEventListener('click', () => {
            this.showRelationSelector();
            this.pendingEdge = {
                source: edge.source,
                target: edge.target,
                sourcePosition: edge.sourcePosition,
                targetPosition: edge.targetPosition,
                isEdit: true,
                existingEdgeId: edge.id
            };
        });
        
        g.appendChild(line);
        g.appendChild(labelBg);
        g.appendChild(label);
        
        this.edgesSvg.appendChild(g);
    }
    
    updateEdgeLabel(edge) {
        const edgeEl = document.getElementById(edge.id);
        if (edgeEl) {
            const label = edgeEl.querySelector('.edge-label');
            if (label) {
                label.textContent = edge.relation;
            }
        }
    }
    
    updateEdges() {
        this.edges.forEach(edge => {
            const edgeEl = document.getElementById(edge.id);
            if (!edgeEl) return;
            
            const startPoint = this.getNodeConnectionPoint(edge.source, edge.sourcePosition);
            const endPoint = this.getNodeConnectionPoint(edge.target, edge.targetPosition);
            
            const path = this.createBezierPath(
                startPoint.x, startPoint.y,
                endPoint.x, endPoint.y,
                edge.sourcePosition, edge.targetPosition
            );
            
            const line = edgeEl.querySelector('.edge-line');
            if (line) {
                line.setAttribute('d', path);
            }
            
            const midX = (startPoint.x + endPoint.x) / 2;
            const midY = (startPoint.y + endPoint.y) / 2;
            
            const labelBg = edgeEl.querySelector('.edge-label-bg');
            if (labelBg) {
                labelBg.setAttribute('x', midX - 25);
                labelBg.setAttribute('y', midY - 12);
            }
            
            const label = edgeEl.querySelector('.edge-label');
            if (label) {
                label.setAttribute('x', midX);
                label.setAttribute('y', midY + 5);
            }
        });
    }
    
    deleteNode(nodeId) {
        this.edges = this.edges.filter(edge => {
            if (edge.source === nodeId || edge.target === nodeId) {
                const edgeEl = document.getElementById(edge.id);
                if (edgeEl) edgeEl.remove();
                return false;
            }
            return true;
        });
        
        this.nodes = this.nodes.filter(n => n.id !== nodeId);
        const nodeEl = document.getElementById(nodeId);
        if (nodeEl) nodeEl.remove();
        
        this.updateCounts();
        this.showToast('节点已删除', 'success');
    }
    
    deleteSelected() {
        const selectedNodes = this.nodes.filter(n => n.selected);
        selectedNodes.forEach(node => {
            this.deleteNode(node.id);
        });
    }
    
    clearCanvas() {
        if (this.nodes.length === 0 && this.edges.length === 0) {
            this.showToast('画布已是空的', 'error');
            return;
        }
        
        this.nodes = [];
        this.edges = [];
        this.nodesContainer.innerHTML = '';
        
        this.isConnecting = false;
        this.connectionStart = null;
        this.pendingEdge = null;
        this.tempLine = null;
        
        const defs = this.edgesSvg.querySelector('defs');
        this.edgesSvg.innerHTML = '';
        if (defs) {
            this.edgesSvg.appendChild(defs);
        }
        
        this.updateCounts();
        this.hideRelationSelector();
        this.showToast('画布已清空', 'success');
    }
    
    updateCounts() {
        this.nodeCountEl.textContent = `节点: ${this.nodes.length}`;
        this.edgeCountEl.textContent = `连线: ${this.edges.length}`;
    }
    
    async generateReport() {
        if (this.nodes.length === 0) {
            this.showToast('请先添加节点', 'error');
            return;
        }
        
        const graphData = {
            nodes: this.nodes.map(n => ({
                id: n.id,
                label: n.label,
                type: n.type
            })),
            edges: this.edges.map(e => ({
                source: e.source,
                target: e.target,
                relation: e.relation
            }))
        };
        
        try {
            const response = await fetch('/api/generate-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(graphData)
            });
            
            const result = await response.json();
            this.reportContent.textContent = result.report;
            this.reportSidebar.style.display = 'block';
            this.showToast('报告已生成', 'success');
            
        } catch (error) {
            console.error('Error:', error);
            this.showToast('生成报告失败', 'error');
        }
    }
    
    closeReport() {
        this.reportSidebar.style.display = 'none';
    }
    
    async copyReport() {
        const reportText = this.reportContent.textContent;
        try {
            await navigator.clipboard.writeText(reportText);
            this.showToast('报告已复制到剪贴板', 'success');
        } catch (error) {
            const textarea = document.createElement('textarea');
            textarea.value = reportText;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast('报告已复制到剪贴板', 'success');
        }
    }
    
    showToast(message, type = 'info') {
        this.toast.textContent = message;
        this.toast.className = `toast ${type}`;
        
        setTimeout(() => {
            this.toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CausalCanvasApp();
});
