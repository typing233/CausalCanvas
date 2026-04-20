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
        
        this.highlightedNodes = new Set();
        this.highlightedEdges = new Set();
        this.rootNodes = new Set();
        this.resultNodes = new Set();
        this.cycles = [];
        
        this.deepseekApiKey = '';
        this.deepseekModel = 'deepseek-chat';
        
        this.currentSection = 'text-input';
        this.influenceResults = null;
        this.pathResults = null;
        this.criticalPathNodes = [];
        this.criticalPathEdges = [];
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.initSvgDefs();
        this.updateCounts();
        this.loadAiConfig();
    }
    
    cacheElements() {
        this.sectionTabs = document.querySelectorAll('.section-tab');
        
        this.textInputSection = document.getElementById('textInputSection');
        this.textInput = document.getElementById('textInput');
        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.extractedSection = document.getElementById('extractedSection');
        this.tagsContainer = document.getElementById('tagsContainer');
        this.filterTabs = document.querySelectorAll('.filter-tab');
        
        this.naturalGraphSection = document.getElementById('naturalGraphSection');
        this.naturalGraphInput = document.getElementById('naturalGraphInput');
        this.useAIGraph = document.getElementById('useAIGraph');
        this.generateGraphBtn = document.getElementById('generateGraphBtn');
        
        this.influenceAnalysisSection = document.getElementById('influenceAnalysisSection');
        this.analyzeInfluenceBtn = document.getElementById('analyzeInfluenceBtn');
        this.influenceResultsEl = document.getElementById('influenceResults');
        this.influenceSummary = document.getElementById('influenceSummary');
        this.metricsList = document.getElementById('metricsList');
        
        this.pathQuerySection = document.getElementById('pathQuerySection');
        this.startNodeSelect = document.getElementById('startNodeSelect');
        this.endNodeSelect = document.getElementById('endNodeSelect');
        this.queryPathBtn = document.getElementById('queryPathBtn');
        this.pathResultsEl = document.getElementById('pathResults');
        this.pathSummary = document.getElementById('pathSummary');
        this.criticalPathDisplay = document.getElementById('criticalPathDisplay');
        this.allPathsDisplay = document.getElementById('allPathsDisplay');
        this.highlightCriticalPathBtn = document.getElementById('highlightCriticalPathBtn');
        this.clearPathHighlightBtn = document.getElementById('clearPathHighlightBtn');
        
        this.canvas = document.getElementById('canvas');
        this.nodesContainer = document.getElementById('nodesContainer');
        this.edgesSvg = document.getElementById('edgesSvg');
        
        this.nodeCountEl = document.getElementById('nodeCount');
        this.edgeCountEl = document.getElementById('edgeCount');
        this.clearCanvasBtn = document.getElementById('clearCanvasBtn');
        this.generateReportBtn = document.getElementById('generateReportBtn');
        
        this.analyzeGraphBtn = document.getElementById('analyzeGraphBtn');
        this.clearAnalysisBtn = document.getElementById('clearAnalysisBtn');
        this.highlightDownstreamBtn = document.getElementById('highlightDownstreamBtn');
        this.highlightUpstreamBtn = document.getElementById('highlightUpstreamBtn');
        this.clearHighlightBtn = document.getElementById('clearHighlightBtn');
        
        this.relationSelector = document.getElementById('relationSelector');
        this.cancelRelationBtn = document.getElementById('cancelRelation');
        this.relationBtns = document.querySelectorAll('.relation-btn');
        
        this.reportSidebar = document.getElementById('reportSidebar');
        this.reportContent = document.getElementById('reportContent');
        this.copyReportBtn = document.getElementById('copyReportBtn');
        this.closeReportBtn = document.getElementById('closeReportBtn');
        
        this.aiConfigSection = document.getElementById('aiConfigSection');
        this.toggleAiConfigBtn = document.getElementById('toggleAiConfigBtn');
        this.deepseekApiKeyInput = document.getElementById('deepseekApiKey');
        this.deepseekModelSelect = document.getElementById('deepseekModel');
        this.saveAiConfigBtn = document.getElementById('saveAiConfigBtn');
        this.aiGenerateReportBtn = document.getElementById('aiGenerateReportBtn');
        
        this.rewriteSection = document.getElementById('rewriteSection');
        this.toggleRewriteBtn = document.getElementById('toggleRewriteBtn');
        this.rewriteStyleSelect = document.getElementById('rewriteStyle');
        this.expandNodeSelect = document.getElementById('expandNode');
        this.rewriteSelectedBtn = document.getElementById('rewriteSelectedBtn');
        this.expandNodeBtn = document.getElementById('expandNodeBtn');
        this.cancelRewriteBtn = document.getElementById('cancelRewriteBtn');
        
        this.isRewriteMode = false;
        
        this.toast = document.getElementById('toast');
    }
    
    bindEvents() {
        this.sectionTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchSection(tab.dataset.section));
        });
        
        this.analyzeBtn.addEventListener('click', () => this.analyzeText());
        
        this.filterTabs.forEach(tab => {
            tab.addEventListener('click', () => this.setFilter(tab.dataset.type));
        });
        
        this.generateGraphBtn.addEventListener('click', () => this.generateGraphFromText());
        this.analyzeInfluenceBtn.addEventListener('click', () => this.analyzeInfluence());
        
        this.queryPathBtn.addEventListener('click', () => this.queryPath());
        this.highlightCriticalPathBtn.addEventListener('click', () => this.highlightCriticalPath());
        this.clearPathHighlightBtn.addEventListener('click', () => this.clearPathHighlight());
        
        this.clearCanvasBtn.addEventListener('click', () => this.clearCanvas());
        this.generateReportBtn.addEventListener('click', () => this.generateReport());
        
        this.analyzeGraphBtn.addEventListener('click', () => this.analyzeGraphStructure());
        this.clearAnalysisBtn.addEventListener('click', () => this.clearGraphAnalysis());
        this.highlightDownstreamBtn.addEventListener('click', () => this.highlightDownstreamPath());
        this.highlightUpstreamBtn.addEventListener('click', () => this.highlightUpstreamPath());
        this.clearHighlightBtn.addEventListener('click', () => this.clearHighlights());
        
        this.cancelRelationBtn.addEventListener('click', () => this.cancelConnection());
        this.relationBtns.forEach(btn => {
            btn.addEventListener('click', () => this.confirmRelation(btn.dataset.relation));
        });
        
        this.copyReportBtn.addEventListener('click', () => this.copyReport());
        this.closeReportBtn.addEventListener('click', () => this.closeReport());
        
        this.toggleAiConfigBtn.addEventListener('click', () => this.toggleAiConfig());
        this.saveAiConfigBtn.addEventListener('click', () => this.saveAiConfig());
        this.aiGenerateReportBtn.addEventListener('click', () => this.aiGenerateReport());
        
        this.toggleRewriteBtn.addEventListener('click', () => this.toggleRewriteMode());
        this.rewriteSelectedBtn.addEventListener('click', () => this.rewriteSelectedText());
        this.expandNodeBtn.addEventListener('click', () => this.expandSelectedNode());
        this.cancelRewriteBtn.addEventListener('click', () => this.cancelRewrite());
        
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
    
    switchSection(section) {
        this.currentSection = section;
        
        this.sectionTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.section === section);
        });
        
        if (this.textInputSection) this.textInputSection.style.display = 'none';
        if (this.extractedSection) this.extractedSection.style.display = 'none';
        if (this.naturalGraphSection) this.naturalGraphSection.style.display = 'none';
        if (this.influenceAnalysisSection) this.influenceAnalysisSection.style.display = 'none';
        if (this.pathQuerySection) this.pathQuerySection.style.display = 'none';
        
        switch(section) {
            case 'text-input':
                if (this.textInputSection) this.textInputSection.style.display = 'block';
                if (this.extractedEntities.length > 0 && this.extractedSection) {
                    this.extractedSection.style.display = 'block';
                }
                break;
            case 'natural-graph':
                if (this.naturalGraphSection) this.naturalGraphSection.style.display = 'block';
                break;
            case 'influence-analysis':
                if (this.influenceAnalysisSection) this.influenceAnalysisSection.style.display = 'block';
                break;
            case 'path-query':
                if (this.pathQuerySection) this.pathQuerySection.style.display = 'block';
                this.updateNodeSelectors();
                break;
        }
    }
    
    updateNodeSelectors() {
        if (!this.startNodeSelect || !this.endNodeSelect) return;
        
        this.startNodeSelect.innerHTML = '<option value="">-- 选择起点 --</option>';
        this.endNodeSelect.innerHTML = '<option value="">-- 选择终点 --</option>';
        
        this.nodes.forEach(node => {
            const option1 = document.createElement('option');
            option1.value = node.id;
            option1.textContent = node.label;
            this.startNodeSelect.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = node.id;
            option2.textContent = node.label;
            this.endNodeSelect.appendChild(option2);
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
    
    analyzeGraphStructure() {
        if (this.nodes.length === 0) {
            this.showToast('请先添加节点', 'error');
            return;
        }
        
        this.rootNodes = new Set();
        this.resultNodes = new Set();
        this.cycles = [];
        
        const nodeIds = new Set(this.nodes.map(n => n.id));
        const inEdges = new Map();
        const outEdges = new Map();
        
        nodeIds.forEach(id => {
            inEdges.set(id, []);
            outEdges.set(id, []);
        });
        
        this.edges.forEach(edge => {
            if (outEdges.has(edge.source)) {
                outEdges.get(edge.source).push(edge.target);
            }
            if (inEdges.has(edge.target)) {
                inEdges.get(edge.target).push(edge.source);
            }
        });
        
        this.nodes.forEach(node => {
            if (inEdges.get(node.id).length === 0) {
                this.rootNodes.add(node.id);
            }
            if (outEdges.get(node.id).length === 0) {
                this.resultNodes.add(node.id);
            }
        });
        
        this.detectCycles(outEdges, nodeIds);
        
        this.updateNodeMarkers();
        
        let message = `分析完成：根因节点 ${this.rootNodes.size} 个，结果节点 ${this.resultNodes.size} 个`;
        if (this.cycles.length > 0) {
            message += `，检测到 ${this.cycles.length} 个循环因果！`;
            this.showToast(message, 'warning');
        } else {
            this.showToast(message, 'success');
        }
        
        this.showAnalysisResult();
    }
    
    detectCycles(outEdges, nodeIds) {
        const visited = new Set();
        const recursionStack = new Set();
        const path = [];
        
        const dfs = (nodeId) => {
            if (recursionStack.has(nodeId)) {
                const cycleStartIndex = path.indexOf(nodeId);
                if (cycleStartIndex !== -1) {
                    const cycle = path.slice(cycleStartIndex);
                    cycle.push(nodeId);
                    this.cycles.push([...cycle]);
                }
                return;
            }
            
            if (visited.has(nodeId)) {
                return;
            }
            
            visited.add(nodeId);
            recursionStack.add(nodeId);
            path.push(nodeId);
            
            const neighbors = outEdges.get(nodeId) || [];
            neighbors.forEach(neighbor => {
                dfs(neighbor);
            });
            
            recursionStack.delete(nodeId);
            path.pop();
        };
        
        nodeIds.forEach(nodeId => {
            if (!visited.has(nodeId)) {
                dfs(nodeId);
            }
        });
    }
    
    updateNodeMarkers() {
        this.nodes.forEach(node => {
            const nodeEl = document.getElementById(node.id);
            if (!nodeEl) return;
            
            nodeEl.classList.remove('root-node', 'result-node', 'cycle-node');
            
            if (this.rootNodes.has(node.id)) {
                nodeEl.classList.add('root-node');
            }
            if (this.resultNodes.has(node.id)) {
                nodeEl.classList.add('result-node');
            }
            
            const isInCycle = this.cycles.some(cycle => cycle.includes(node.id));
            if (isInCycle) {
                nodeEl.classList.add('cycle-node');
            }
        });
    }
    
    showAnalysisResult() {
        const rootLabels = Array.from(this.rootNodes).map(id => {
            const node = this.nodes.find(n => n.id === id);
            return node ? node.label : id;
        });
        
        const resultLabels = Array.from(this.resultNodes).map(id => {
            const node = this.nodes.find(n => n.id === id);
            return node ? node.label : id;
        });
        
        let info = '📊 图谱结构分析结果\n\n';
        info += `🌱 根因节点（无入边）：${rootLabels.length} 个\n`;
        if (rootLabels.length > 0) {
            info += `   - ${rootLabels.join('、')}\n`;
        }
        
        info += `\n🎯 结果节点（无出边）：${resultLabels.length} 个\n`;
        if (resultLabels.length > 0) {
            info += `   - ${resultLabels.join('、')}\n`;
        }
        
        if (this.cycles.length > 0) {
            info += `\n⚠️ 警告：检测到 ${this.cycles.length} 个循环因果！\n`;
            this.cycles.forEach((cycle, index) => {
                const cycleLabels = cycle.map(id => {
                    const node = this.nodes.find(n => n.id === id);
                    return node ? node.label : id;
                });
                info += `   循环 ${index + 1}：${cycleLabels.join(' → ')}\n`;
            });
        }
        
        this.reportContent.textContent = info;
        this.reportSidebar.style.display = 'block';
    }
    
    clearGraphAnalysis() {
        this.rootNodes = new Set();
        this.resultNodes = new Set();
        this.cycles = [];
        
        this.nodes.forEach(node => {
            const nodeEl = document.getElementById(node.id);
            if (nodeEl) {
                nodeEl.classList.remove('root-node', 'result-node', 'cycle-node');
            }
        });
        
        this.showToast('已清除图谱分析标记', 'success');
    }
    
    highlightDownstreamPath() {
        const selectedNodes = this.nodes.filter(n => n.selected);
        if (selectedNodes.length === 0) {
            this.showToast('请先选择一个或多个节点', 'error');
            return;
        }
        
        this.clearHighlights();
        
        const outEdges = new Map();
        const nodeIds = new Set(this.nodes.map(n => n.id));
        
        nodeIds.forEach(id => {
            outEdges.set(id, []);
        });
        
        this.edges.forEach(edge => {
            if (outEdges.has(edge.source)) {
                outEdges.get(edge.source).push({ target: edge.target, edgeId: edge.id });
            }
        });
        
        const visited = new Set();
        const queue = [];
        
        selectedNodes.forEach(node => {
            queue.push(node.id);
            visited.add(node.id);
            this.highlightedNodes.add(node.id);
        });
        
        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = outEdges.get(current) || [];
            
            neighbors.forEach(({ target, edgeId }) => {
                if (!visited.has(target)) {
                    visited.add(target);
                    queue.push(target);
                    this.highlightedNodes.add(target);
                    this.highlightedEdges.add(edgeId);
                } else if (this.highlightedNodes.has(target)) {
                    this.highlightedEdges.add(edgeId);
                }
            });
        }
        
        this.applyHighlights();
        
        const nodeCount = this.highlightedNodes.size;
        const edgeCount = this.highlightedEdges.size;
        this.showToast(`已高亮 ${nodeCount} 个节点和 ${edgeCount} 条连线`, 'success');
    }
    
    highlightUpstreamPath() {
        const selectedNodes = this.nodes.filter(n => n.selected);
        if (selectedNodes.length === 0) {
            this.showToast('请先选择一个或多个节点', 'error');
            return;
        }
        
        this.clearHighlights();
        
        const inEdges = new Map();
        const nodeIds = new Set(this.nodes.map(n => n.id));
        
        nodeIds.forEach(id => {
            inEdges.set(id, []);
        });
        
        this.edges.forEach(edge => {
            if (inEdges.has(edge.target)) {
                inEdges.get(edge.target).push({ source: edge.source, edgeId: edge.id });
            }
        });
        
        const visited = new Set();
        const queue = [];
        
        selectedNodes.forEach(node => {
            queue.push(node.id);
            visited.add(node.id);
            this.highlightedNodes.add(node.id);
        });
        
        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = inEdges.get(current) || [];
            
            neighbors.forEach(({ source, edgeId }) => {
                if (!visited.has(source)) {
                    visited.add(source);
                    queue.push(source);
                    this.highlightedNodes.add(source);
                    this.highlightedEdges.add(edgeId);
                } else if (this.highlightedNodes.has(source)) {
                    this.highlightedEdges.add(edgeId);
                }
            });
        }
        
        this.applyHighlights();
        
        const nodeCount = this.highlightedNodes.size;
        const edgeCount = this.highlightedEdges.size;
        this.showToast(`已高亮 ${nodeCount} 个节点和 ${edgeCount} 条连线`, 'success');
    }
    
    applyHighlights() {
        this.nodes.forEach(node => {
            const nodeEl = document.getElementById(node.id);
            if (!nodeEl) return;
            
            if (this.highlightedNodes.has(node.id)) {
                nodeEl.classList.add('highlighted');
            } else {
                nodeEl.classList.add('dimmed');
            }
        });
        
        this.edges.forEach(edge => {
            const edgeEl = document.getElementById(edge.id);
            if (!edgeEl) return;
            
            const line = edgeEl.querySelector('.edge-line');
            const label = edgeEl.querySelector('.edge-label');
            const labelBg = edgeEl.querySelector('.edge-label-bg');
            
            if (this.highlightedEdges.has(edge.id)) {
                if (line) line.classList.add('highlighted');
                if (label) label.classList.add('highlighted');
                if (labelBg) labelBg.classList.add('highlighted');
            } else {
                if (line) line.classList.add('dimmed');
                if (label) label.classList.add('dimmed');
                if (labelBg) labelBg.classList.add('dimmed');
            }
        });
    }
    
    clearHighlights() {
        this.highlightedNodes.clear();
        this.highlightedEdges.clear();
        
        this.nodes.forEach(node => {
            const nodeEl = document.getElementById(node.id);
            if (nodeEl) {
                nodeEl.classList.remove('highlighted', 'dimmed');
            }
        });
        
        this.edges.forEach(edge => {
            const edgeEl = document.getElementById(edge.id);
            if (!edgeEl) return;
            
            const line = edgeEl.querySelector('.edge-line');
            const label = edgeEl.querySelector('.edge-label');
            const labelBg = edgeEl.querySelector('.edge-label-bg');
            
            if (line) line.classList.remove('highlighted', 'dimmed');
            if (label) label.classList.remove('highlighted', 'dimmed');
            if (labelBg) labelBg.classList.remove('highlighted', 'dimmed');
        });
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
    
    toggleAiConfig() {
        const isVisible = this.aiConfigSection.style.display === 'block';
        this.aiConfigSection.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            this.deepseekApiKeyInput.value = this.deepseekApiKey;
            this.deepseekModelSelect.value = this.deepseekModel;
        }
    }
    
    saveAiConfig() {
        const apiKey = this.deepseekApiKeyInput.value.trim();
        const model = this.deepseekModelSelect.value;
        
        if (!apiKey) {
            this.showToast('请输入API Key', 'error');
            return;
        }
        
        this.deepseekApiKey = apiKey;
        this.deepseekModel = model;
        
        localStorage.setItem('deepseekApiKey', apiKey);
        localStorage.setItem('deepseekModel', model);
        
        this.aiConfigSection.style.display = 'none';
        this.showToast('AI配置已保存', 'success');
    }
    
    loadAiConfig() {
        const savedApiKey = localStorage.getItem('deepseekApiKey');
        const savedModel = localStorage.getItem('deepseekModel');
        
        if (savedApiKey) {
            this.deepseekApiKey = savedApiKey;
        }
        if (savedModel) {
            this.deepseekModel = savedModel;
        }
    }
    
    async aiGenerateReport() {
        if (this.nodes.length === 0) {
            this.showToast('请先添加节点', 'error');
            return;
        }
        
        if (!this.deepseekApiKey) {
            this.showToast('请先配置DeepSeek API Key', 'error');
            this.aiConfigSection.style.display = 'block';
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
            })),
            api_key: this.deepseekApiKey,
            model: this.deepseekModel
        };
        
        this.showToast('🤖 AI正在生成报告，请稍候...', 'info');
        
        try {
            const response = await fetch('/api/ai-generate-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(graphData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || '生成报告失败');
            }
            
            const result = await response.json();
            this.reportContent.textContent = result.report;
            this.reportSidebar.style.display = 'block';
            this.showToast('AI报告已生成', 'success');
            
        } catch (error) {
            console.error('Error:', error);
            this.showToast(error.message || '生成报告失败', 'error');
        }
    }
    
    toggleRewriteMode() {
        this.isRewriteMode = !this.isRewriteMode;
        
        if (this.isRewriteMode) {
            this.rewriteSection.style.display = 'block';
            this.reportContent.contentEditable = 'true';
            this.reportContent.classList.add('editable');
            this.updateNodeSelector();
            this.showToast('已进入改写模式，可选择文本进行改写', 'info');
        } else {
            this.rewriteSection.style.display = 'none';
            this.reportContent.contentEditable = 'false';
            this.reportContent.classList.remove('editable');
        }
    }
    
    updateNodeSelector() {
        if (!this.expandNodeSelect) return;
        
        this.expandNodeSelect.innerHTML = '<option value="">-- 选择节点 --</option>';
        
        this.nodes.forEach(node => {
            const option = document.createElement('option');
            option.value = node.id;
            option.textContent = node.label;
            this.expandNodeSelect.appendChild(option);
        });
    }
    
    getSelectedText() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            return selection.toString().trim();
        }
        return '';
    }
    
    async rewriteSelectedText() {
        const selectedText = this.getSelectedText();
        
        if (!selectedText) {
            this.showToast('请先在报告中选择要改写的文本', 'error');
            return;
        }
        
        if (!this.deepseekApiKey) {
            this.showToast('请先配置DeepSeek API Key', 'error');
            return;
        }
        
        const style = this.rewriteStyleSelect.value;
        
        const requestData = {
            text: selectedText,
            style: style,
            api_key: this.deepseekApiKey,
            model: this.deepseekModel
        };
        
        this.showToast('🤖 AI正在改写文本，请稍候...', 'info');
        
        try {
            const response = await fetch('/api/ai-rewrite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || '改写失败');
            }
            
            const result = await response.json();
            const rewrittenText = result.rewritten_text;
            
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(rewrittenText));
            }
            
            this.showToast('文本已改写', 'success');
            
        } catch (error) {
            console.error('Error:', error);
            this.showToast(error.message || '改写失败', 'error');
        }
    }
    
    async expandSelectedNode() {
        const selectedNodeId = this.expandNodeSelect.value;
        
        if (!selectedNodeId) {
            this.showToast('请先选择要扩写的节点', 'error');
            return;
        }
        
        if (!this.deepseekApiKey) {
            this.showToast('请先配置DeepSeek API Key', 'error');
            return;
        }
        
        const node = this.nodes.find(n => n.id === selectedNodeId);
        if (!node) {
            this.showToast('节点不存在', 'error');
            return;
        }
        
        const currentReport = this.reportContent.textContent;
        
        const requestData = {
            node_label: node.label,
            context: currentReport,
            api_key: this.deepseekApiKey,
            model: this.deepseekModel
        };
        
        this.showToast('🤖 AI正在扩写节点，请稍候...', 'info');
        
        try {
            const response = await fetch('/api/ai-expand', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || '扩写失败');
            }
            
            const result = await response.json();
            const expandedText = result.expanded_text;
            
            const newContent = currentReport + '\n\n---\n\n【' + node.label + '详细说明】\n' + expandedText;
            this.reportContent.textContent = newContent;
            
            this.showToast('节点已扩写', 'success');
            
        } catch (error) {
            console.error('Error:', error);
            this.showToast(error.message || '扩写失败', 'error');
        }
    }
    
    cancelRewrite() {
        this.isRewriteMode = false;
        this.rewriteSection.style.display = 'none';
        this.reportContent.contentEditable = 'false';
        this.reportContent.classList.remove('editable');
        this.showToast('已退出改写模式', 'info');
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

    async analyzeInfluence() {
        if (this.nodes.length === 0) {
            this.showToast('请先在画布上添加节点', 'error');
            return;
        }
        
        const graphData = {
            nodes: this.nodes.map(n => ({
                id: n.id,
                label: n.label,
                type: n.type
            })),
            edges: this.edges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                relation: e.relation
            }))
        };
        
        try {
            this.showToast('📈 正在分析影响度...', 'info');
            
            const response = await fetch('/api/analyze-influence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(graphData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || '分析失败');
            }
            
            const result = await response.json();
            this.influenceResults = result;
            
            this.renderInfluenceResults(result);
            
            this.showToast('影响分析完成！', 'success');
            
        } catch (error) {
            console.error('Error:', error);
            this.showToast(error.message || '分析失败', 'error');
        }
    }
    
    renderInfluenceResults(result) {
        if (!this.influenceSummary || !this.metricsList) return;
        
        this.influenceResultsEl.style.display = 'block';
        
        const summary = result.summary;
        this.influenceSummary.innerHTML = `
            <div class="summary-item">
                <span class="summary-label">节点总数:</span>
                <span class="summary-value">${summary.total_nodes}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">连线总数:</span>
                <span class="summary-value">${summary.total_edges}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">平均入度:</span>
                <span class="summary-value">${summary.avg_in_degree}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">平均出度:</span>
                <span class="summary-value">${summary.avg_out_degree}</span>
            </div>
        `;
        
        this.metricsList.innerHTML = '';
        
        result.node_metrics.forEach((metric, index) => {
            const typeLabels = {
                'person': '人物',
                'event': '事件',
                'noun': '概念'
            };
            const typeLabel = typeLabels[metric.type] || metric.type;
            
            const rankBadge = index === 0 ? '<span class="rank-badge rank-1">🥇</span>' :
                              index === 1 ? '<span class="rank-badge rank-2">🥈</span>' :
                              index === 2 ? '<span class="rank-badge rank-3">🥉</span>' :
                              `<span class="rank-badge rank-other">#${index + 1}</span>`;
            
            const metricItem = document.createElement('div');
            metricItem.className = 'metric-item';
            metricItem.innerHTML = `
                <div class="metric-header">
                    ${rankBadge}
                    <span class="metric-label">${metric.label}</span>
                    <span class="metric-type">${typeLabel}</span>
                </div>
                <div class="metric-details">
                    <div class="metric-detail">
                        <span class="detail-label">入度</span>
                        <span class="detail-value">${metric.in_degree}</span>
                    </div>
                    <div class="metric-detail">
                        <span class="detail-label">出度</span>
                        <span class="detail-value">${metric.out_degree}</span>
                    </div>
                    <div class="metric-detail">
                        <span class="detail-label">总度数</span>
                        <span class="detail-value">${metric.total_degree}</span>
                    </div>
                    <div class="metric-detail">
                        <span class="detail-label">介数中心性</span>
                        <span class="detail-value">${metric.betweenness_centrality}</span>
                    </div>
                </div>
                <div class="metric-score">
                    <span class="score-label">影响得分</span>
                    <span class="score-value">${metric.influence_score}</span>
                </div>
            `;
            
            metricItem.addEventListener('click', () => {
                this.highlightNode(metric.node_id);
            });
            
            this.metricsList.appendChild(metricItem);
        });
    }
    
    highlightNode(nodeId) {
        this.clearHighlights();
        
        this.highlightedNodes.add(nodeId);
        
        this.nodes.forEach(node => {
            const nodeEl = document.getElementById(node.id);
            if (!nodeEl) return;
            
            if (node.id === nodeId) {
                nodeEl.classList.add('highlighted');
            } else {
                nodeEl.classList.add('dimmed');
            }
        });
    }
    
    async queryPath() {
        if (this.nodes.length === 0) {
            this.showToast('请先在画布上添加节点', 'error');
            return;
        }
        
        const startNodeId = this.startNodeSelect.value;
        const endNodeId = this.endNodeSelect.value;
        
        if (!startNodeId || !endNodeId) {
            this.showToast('请选择起点和终点节点', 'error');
            return;
        }
        
        if (startNodeId === endNodeId) {
            this.showToast('起点和终点不能相同', 'error');
            return;
        }
        
        const graphData = {
            nodes: this.nodes.map(n => ({
                id: n.id,
                label: n.label,
                type: n.type
            })),
            edges: this.edges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                relation: e.relation
            })),
            start_node_id: startNodeId,
            end_node_id: endNodeId
        };
        
        try {
            this.showToast('🔍 正在查询路径...', 'info');
            
            const response = await fetch('/api/query-path', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(graphData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || '查询失败');
            }
            
            const result = await response.json();
            this.pathResults = result;
            
            this.renderPathResults(result);
            
            if (result.paths.length > 0) {
                this.showToast(result.message, 'success');
            } else {
                this.showToast(result.message, 'warning');
            }
            
        } catch (error) {
            console.error('Error:', error);
            this.showToast(error.message || '查询失败', 'error');
        }
    }
    
    renderPathResults(result) {
        if (!this.pathSummary || !this.criticalPathDisplay || !this.allPathsDisplay) return;
        
        this.pathResultsEl.style.display = 'block';
        
        this.pathSummary.innerHTML = `
            <div class="summary-item">
                <span class="summary-label">起点:</span>
                <span class="summary-value highlight">${result.start_label || result.start_node_id}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">终点:</span>
                <span class="summary-value highlight">${result.end_label || result.end_node_id}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">路径数量:</span>
                <span class="summary-value">${result.total_paths || 0}</span>
            </div>
        `;
        
        if (result.critical_path) {
            this.criticalPathNodes = result.critical_path.node_ids;
            this.criticalPathEdges = result.critical_path.edges.map(e => e.edge_id);
            
            const pathDisplay = this.renderPathDisplay(result.critical_path, true);
            this.criticalPathDisplay.innerHTML = pathDisplay;
            
            this.highlightCriticalPathBtn.style.display = 'block';
        } else {
            this.criticalPathDisplay.innerHTML = '<p style="color: #6b7280; text-align: center;">没有找到关键路径</p>';
            this.highlightCriticalPathBtn.style.display = 'none';
        }
        
        if (result.paths && result.paths.length > 0) {
            let pathsHtml = '';
            result.paths.forEach((path, index) => {
                pathsHtml += `<div class="path-item" data-index="${index}">
                    <div class="path-header">
                        <span class="path-rank">#${index + 1}</span>
                        <span class="path-weight">权重: ${path.weight}</span>
                        <span class="path-length">边数: ${path.length}</span>
                    </div>
                    <div class="path-nodes">
                        ${path.nodes.map((n, i) => 
                            `<span class="path-node">${n.label}</span>` +
                            (i < path.nodes.length - 1 ? 
                                `<span class="path-arrow">→</span>` : ''
                            )
                        ).join('')}
                    </div>
                </div>`;
            });
            this.allPathsDisplay.innerHTML = pathsHtml;
            
            document.querySelectorAll('.path-item').forEach((item, index) => {
                item.addEventListener('click', () => {
                    this.highlightPath(result.paths[index]);
                });
            });
        } else {
            this.allPathsDisplay.innerHTML = '<p style="color: #6b7280; text-align: center;">没有找到可用路径</p>';
        }
        
        this.clearPathHighlightBtn.style.display = 'block';
    }
    
    renderPathDisplay(path, isCritical) {
        const nodesHtml = path.nodes.map((n, i) => {
            const edgeLabel = i < path.edges.length ? path.edges[i].relation : '';
            return `<span class="path-node-display">${n.label}</span>` +
                   (i < path.nodes.length - 1 ? 
                    `<span class="path-edge-display">${edgeLabel}</span>` : '');
        }).join('');
        
        return `
            <div class="path-display ${isCritical ? 'critical' : ''}">
                <div class="path-nodes-display">
                    ${nodesHtml}
                </div>
                <div class="path-meta">
                    <span class="meta-item">权重: <strong>${path.weight}</strong></span>
                    <span class="meta-item">边数: <strong>${path.length}</strong></span>
                </div>
            </div>
        `;
    }
    
    highlightCriticalPath() {
        if (!this.criticalPathNodes || this.criticalPathNodes.length === 0) {
            this.showToast('没有可高亮的关键路径', 'error');
            return;
        }
        
        this.clearHighlights();
        
        this.criticalPathNodes.forEach(nodeId => {
            this.highlightedNodes.add(nodeId);
        });
        
        this.criticalPathEdges.forEach(edgeId => {
            this.highlightedEdges.add(edgeId);
        });
        
        this.applyPathHighlights();
        
        this.showToast('关键路径已高亮', 'success');
    }
    
    highlightPath(path) {
        this.clearHighlights();
        
        path.node_ids.forEach(nodeId => {
            this.highlightedNodes.add(nodeId);
        });
        
        path.edges.forEach(edge => {
            this.highlightedEdges.add(edge.edge_id);
        });
        
        this.applyPathHighlights();
    }
    
    applyPathHighlights() {
        this.nodes.forEach(node => {
            const nodeEl = document.getElementById(node.id);
            if (!nodeEl) return;
            
            if (this.highlightedNodes.has(node.id)) {
                nodeEl.classList.add('highlighted');
                nodeEl.classList.add('path-highlight');
            } else {
                nodeEl.classList.add('dimmed');
            }
        });
        
        this.edges.forEach(edge => {
            const edgeEl = document.getElementById(edge.id);
            if (!edgeEl) return;
            
            const line = edgeEl.querySelector('.edge-line');
            const label = edgeEl.querySelector('.edge-label');
            const labelBg = edgeEl.querySelector('.edge-label-bg');
            
            if (this.highlightedEdges.has(edge.id)) {
                if (line) {
                    line.classList.add('highlighted');
                    line.classList.add('path-highlight');
                }
                if (label) {
                    label.classList.add('highlighted');
                    label.classList.add('path-highlight');
                }
                if (labelBg) {
                    labelBg.classList.add('highlighted');
                    labelBg.classList.add('path-highlight');
                }
            } else {
                if (line) line.classList.add('dimmed');
                if (label) label.classList.add('dimmed');
                if (labelBg) labelBg.classList.add('dimmed');
            }
        });
    }
    
    clearPathHighlight() {
        this.criticalPathNodes = [];
        this.criticalPathEdges = [];
        this.clearHighlights();
        this.showToast('路径高亮已清除', 'success');
    }
    
    async generateGraphFromText() {
        const text = this.naturalGraphInput.value.trim();
        if (!text) {
            this.showToast('请输入因果描述文本', 'error');
            return;
        }
        
        const useAI = this.useAIGraph.checked;
        
        if (useAI && !this.deepseekApiKey) {
            this.showToast('使用 AI 解析需要先配置 API Key', 'error');
            return;
        }
        
        const requestData = {
            text: text
        };
        
        if (useAI) {
            requestData.api_key = this.deepseekApiKey;
            requestData.model = this.deepseekModel;
        }
        
        try {
            this.showToast('🚀 正在生成图谱...', 'info');
            
            const response = await fetch('/api/natural-language-graph', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || '生成失败');
            }
            
            const result = await response.json();
            
            if (result.nodes.length === 0) {
                this.showToast(result.message || '未能提取足够的实体', 'error');
                return;
            }
            
            this.nodes = [];
            this.edges = [];
            this.nodesContainer.innerHTML = '';
            
            const defs = this.edgesSvg.querySelector('defs');
            this.edgesSvg.innerHTML = '';
            if (defs) {
                this.edgesSvg.appendChild(defs);
            }
            
            const canvasRect = this.canvas.getBoundingClientRect();
            const nodeCount = result.nodes.length;
            const centerX = canvasRect.width / 2;
            const centerY = canvasRect.height / 2;
            const radius = Math.min(canvasRect.width, canvasRect.height) * 0.35;
            
            result.nodes.forEach((node, index) => {
                const angle = (2 * Math.PI * index) / nodeCount - Math.PI / 2;
                const x = centerX + radius * Math.cos(angle) - 60;
                const y = centerY + radius * Math.sin(angle) - 20;
                
                const nodeData = {
                    id: node.id,
                    label: node.label,
                    type: node.type,
                    x: Math.max(20, x),
                    y: Math.max(20, y),
                    selected: false
                };
                
                this.nodes.push(nodeData);
                this.renderNode(nodeData);
                
                const nodeNum = parseInt(node.id.replace('n', ''));
                if (nodeNum > this.nodeIdCounter) {
                    this.nodeIdCounter = nodeNum;
                }
            });
            
            result.edges.forEach(edge => {
                const edgeData = {
                    id: edge.id || `edge-${++this.edgeIdCounter}`,
                    source: edge.source,
                    target: edge.target,
                    sourcePosition: 'right',
                    targetPosition: 'left',
                    relation: edge.relation
                };
                
                const sourceExists = this.nodes.find(n => n.id === edge.source);
                const targetExists = this.nodes.find(n => n.id === edge.target);
                
                if (sourceExists && targetExists) {
                    this.edges.push(edgeData);
                    this.renderEdge(edgeData);
                    
                    if (edge.id) {
                        const edgeNum = parseInt(edge.id.replace('e', ''));
                        if (edgeNum > this.edgeIdCounter) {
                            this.edgeIdCounter = edgeNum;
                        }
                    }
                }
            });
            
            this.updateCounts();
            
            const methodText = result.method === 'ai' ? 'AI 智能解析' : '规则解析';
            this.showToast(`图谱已生成 (${methodText}): ${result.nodes.length} 个节点, ${result.edges.length} 条边`, 'success');
            
        } catch (error) {
            console.error('Error:', error);
            this.showToast(error.message || '生成失败', 'error');
        }
    }
    
    applyHighlights() {
        this.nodes.forEach(node => {
            const nodeEl = document.getElementById(node.id);
            if (!nodeEl) return;
            
            if (this.highlightedNodes.has(node.id)) {
                nodeEl.classList.add('highlighted');
            } else {
                nodeEl.classList.add('dimmed');
            }
        });
        
        this.edges.forEach(edge => {
            const edgeEl = document.getElementById(edge.id);
            if (!edgeEl) return;
            
            const line = edgeEl.querySelector('.edge-line');
            const label = edgeEl.querySelector('.edge-label');
            const labelBg = edgeEl.querySelector('.edge-label-bg');
            
            if (this.highlightedEdges.has(edge.id)) {
                if (line) line.classList.add('highlighted');
                if (label) label.classList.add('highlighted');
                if (labelBg) labelBg.classList.add('highlighted');
            } else {
                if (line) line.classList.add('dimmed');
                if (label) label.classList.add('dimmed');
                if (labelBg) labelBg.classList.add('dimmed');
            }
        });
    }
    
    clearHighlights() {
        this.highlightedNodes.clear();
        this.highlightedEdges.clear();
        
        this.nodes.forEach(node => {
            const nodeEl = document.getElementById(node.id);
            if (nodeEl) {
                nodeEl.classList.remove('highlighted', 'dimmed', 'path-highlight');
            }
        });
        
        this.edges.forEach(edge => {
            const edgeEl = document.getElementById(edge.id);
            if (!edgeEl) return;
            
            const line = edgeEl.querySelector('.edge-line');
            const label = edgeEl.querySelector('.edge-label');
            const labelBg = edgeEl.querySelector('.edge-label-bg');
            
            if (line) line.classList.remove('highlighted', 'dimmed', 'path-highlight');
            if (label) label.classList.remove('highlighted', 'dimmed', 'path-highlight');
            if (labelBg) labelBg.classList.remove('highlighted', 'dimmed', 'path-highlight');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CausalCanvasApp();
});
