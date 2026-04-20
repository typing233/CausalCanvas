from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import jieba
import jieba.posseg as pseg
import re
import os
import httpx

app = FastAPI(title="CausalCanvas - 交互式知识重构工具")

frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/static", StaticFiles(directory=frontend_path), name="static")

DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"


class TextInput(BaseModel):
    text: str


class Edge(BaseModel):
    id: str
    source: str
    target: str
    relation: str


class Node(BaseModel):
    id: str
    label: str
    type: str
    x: float
    y: float


class GraphData(BaseModel):
    nodes: List[Node]
    edges: List[Edge]


class ReportRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


class AIReportRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    api_key: str
    model: str = "deepseek-chat"


class AIRewriteRequest(BaseModel):
    text: str
    style: str
    api_key: str
    model: str = "deepseek-chat"


class AIExpandRequest(BaseModel):
    node_label: str
    context: str
    api_key: str
    model: str = "deepseek-chat"


class PathQueryRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    start_node_id: Optional[str] = None
    end_node_id: Optional[str] = None


class InfluenceAnalysisRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


class NaturalLanguageGraphRequest(BaseModel):
    text: str
    api_key: Optional[str] = None
    model: str = "deepseek-chat"


class ExtractedEntity(BaseModel):
    text: str
    type: str
    count: int


class AnalysisResult(BaseModel):
    entities: List[ExtractedEntity]
    keywords: List[str]


PERSON_PATTERNS = [
    r'[李王张刘陈杨黄赵周吴徐孙胡朱高林何郭马罗梁宋郑谢韩唐冯于董萧程曹袁邓许傅沈曾彭吕苏卢蒋蔡贾丁魏薛叶阎余潘杜戴夏钟汪田任姜范方石姚谭廖邹熊金陆郝孔白崔康毛邱秦江史顾侯邵孟龙万段雷钱汤尹黎易常武乔贺赖龚文][a-zA-Z\u4e00-\u9fa5]{1,3}',
]

EVENT_PATTERNS = [
    r'[^。！？\s]*?(?:革命|战争|起义|政变|改革|运动|事件|危机|灾难|事故|爆发|发生|开始|结束|成立|解散)[^。！？\s]*',
    r'[^。！？\s]*?(?:宣布|决定|签署|发表|发布|提出|通过|实施|执行)[^。！？\s]*',
]


def extract_entities(text: str) -> AnalysisResult:
    entities_dict: Dict[str, Dict] = {}

    for pattern in PERSON_PATTERNS:
        matches = re.findall(pattern, text)
        for match in matches:
            if len(match) >= 2 and len(match) <= 4:
                if match in entities_dict:
                    entities_dict[match]["count"] += 1
                else:
                    entities_dict[match] = {
                        "text": match,
                        "type": "person",
                        "count": 1
                    }

    for pattern in EVENT_PATTERNS:
        matches = re.findall(pattern, text)
        for match in matches:
            if len(match) >= 4:
                if match in entities_dict:
                    entities_dict[match]["count"] += 1
                else:
                    entities_dict[match] = {
                        "text": match,
                        "type": "event",
                        "count": 1
                    }

    words = jieba.lcut(text)
    stop_words = set([
        "的", "了", "是", "在", "我", "有", "和", "就",
        "不", "人", "都", "一", "一个", "上", "也", "很",
        "到", "说", "要", "去", "你", "会", "着", "没有",
        "看", "好", "自己", "这", "那", "他", "她", "它",
        "们", "这个", "那个", "什么", "怎么", "为什么",
        "哪", "哪里", "谁", "多少", "几", "啊", "吧", "呢",
        "吗", "呀", "哦", "嗯", "哈", "啦", "喽", "呗",
        "与", "或", "及", "以及", "而且", "但是", "然而",
        "如果", "因为", "所以", "虽然", "但是", "即使",
        "不但", "而且", "或者", "还是", "要么", "与其",
        "不如", "既然", "那么", "只要", "只有", "除非",
        "无论", "不管", "即使", "纵然", "纵使", "就是",
        "便", "才", "也", "还", "都", "就", "又", "再",
        "已", "已经", "正在", "将要", "曾经", "曾", "刚",
        "刚刚", "正在", "正", "将", "要", "会", "能",
        "可以", "能够", "应该", "必须", "得", "需要",
        "可能", "也许", "大概", "大约", "似乎", "好像",
        "是", "为", "以为", "认为", "觉得", "感到",
        "有", "具有", "拥有", "存在", "出现", "发生",
        "进行", "开展", "实施", "执行", "采取", "采用",
        "把", "被", "让", "给", "向", "对", "对于", "关于",
        "跟", "和", "同", "与", "及", "以及", "及其",
        "之", "的", "地", "得", "所", "者", "以", "于",
        "而", "且", "或", "等", "等等", "之类", "等等",
        "第", "其次", "首先", "第一", "第二", "第三",
        "最后", "最终", "终于", "总之", "总而言之",
        "因此", "因而", "故而", "所以", "于是", "从而",
        "进而", "此外", "另外", "再者", "况且", "何况",
        "尤其", "特别", "甚至", "更是", "极其", "相当",
        "非常", "很", "太", "最", "更", "还", "比较",
        "稍微", "略微", "几乎", "差不多", "简直", "完全",
        "全部", "所有", "一切", "整个", "全体", "每个",
        "各个", "各种", "各类", "种种", "许多", "很多",
        "不少", "少量", "少许", "一些", "有些", "有的",
        "某个", "某些", "某", "本", "该", "此", "这",
        "那", "其", "它", "他", "她", "们", "等", "号",
        "年", "月", "日", "时", "分", "秒", "点", "半",
    ])

    nouns = []
    for word, flag in pseg.cut(text):
        if flag.startswith('n') and len(word) >= 2 and word not in stop_words:
            if word not in [e["text"] for e in entities_dict.values()]:
                if word in entities_dict:
                    entities_dict[word]["count"] += 1
                else:
                    entities_dict[word] = {
                        "text": word,
                        "type": "noun",
                        "count": 1
                    }
                nouns.append(word)

    entities = sorted(
        entities_dict.values(),
        key=lambda x: x["count"],
        reverse=True
    )

    keywords = list(set(nouns))[:30]

    return AnalysisResult(entities=entities, keywords=keywords)


@app.get("/", response_class=HTMLResponse)
async def read_index():
    index_path = os.path.join(frontend_path, "index.html")
    return FileResponse(index_path)


@app.post("/api/analyze", response_model=AnalysisResult)
async def analyze_text(input_data: TextInput):
    if not input_data.text.strip():
        raise HTTPException(status_code=400, detail="文本不能为空")

    try:
        result = extract_entities(input_data.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


@app.post("/api/generate-report")
async def generate_report(data: ReportRequest):
    nodes = data.nodes
    edges = data.edges

    if not nodes:
        return {"report": "画布上没有节点，请先添加节点。"}

    node_dict = {node["id"]: node for node in nodes}

    relation_templates = {
        "导致": "{}导致了{}的发生。",
        "造成": "{}造成了{}。",
        "导火索": "{}成为了{}的导火索。",
        "影响": "{}对{}产生了重要影响。",
        "促使": "{}促使了{}的发展。",
        "引发": "{}引发了{}。",
        "推动": "{}推动了{}的进程。",
        "阻碍": "{}阻碍了{}的发展。",
        "起源于": "{}起源于{}。",
        "结果是": "{}的结果是{}。",
    }

    report_parts = []

    persons = [n["label"] for n in nodes if n.get("type") == "person"]
    events = [n["label"] for n in nodes if n.get("type") == "event"]
    nouns = [n["label"] for n in nodes if n.get("type") == "noun"]

    intro = "本报告总结了以下关键要素："
    if persons:
        intro += f"\n\n主要人物：{', '.join(persons)}。"
    if events:
        intro += f"\n\n关键事件：{', '.join(events)}。"
    if nouns:
        intro += f"\n\n重要概念：{', '.join(nouns)}。"

    report_parts.append(intro)

    if edges:
        report_parts.append("\n\n---\n\n关系分析：")
        for edge in edges:
            source_id = edge.get("source")
            target_id = edge.get("target")
            relation = edge.get("relation", "影响")

            if source_id in node_dict and target_id in node_dict:
                source_label = node_dict[source_id]["label"]
                target_label = node_dict[target_id]["label"]

                template = relation_templates.get(
                    relation, "{}与{}之间存在{}关系。")
                if relation not in relation_templates:
                    sentence = f"{source_label}与{target_label}之间存在{relation}关系。"
                else:
                    sentence = template.format(source_label, target_label)

                report_parts.append(f"\n- {sentence}")
    else:
        report_parts.append(
            "\n\n提示：目前还没有建立节点之间的关系连线。请通过拖拽连线来建立节点之间的因果或逻辑关系，以生成更完整的分析报告。")

    full_report = "".join(report_parts)

    return {"report": full_report}


async def call_deepseek_api(
    api_key: str,
    model: str,
    messages: List[Dict[str, str]],
    temperature: float = 0.7
) -> str:
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                DEEPSEEK_API_URL,
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"DeepSeek API错误: {e.response.text}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"调用DeepSeek API失败: {str(e)}"
            )


@app.post("/api/ai-generate-report")
async def ai_generate_report(data: AIReportRequest):
    if not data.api_key:
        raise HTTPException(status_code=400, detail="请提供DeepSeek API Key")
    
    nodes = data.nodes
    edges = data.edges
    
    if not nodes:
        return {"report": "画布上没有节点，请先添加节点。"}
    
    node_dict = {node["id"]: node for node in nodes}
    
    graph_description = "以下是因果图谱中的节点和关系：\n\n"
    
    graph_description += "【节点列表】\n"
    for node in nodes:
        node_type = node.get("type", "unknown")
        type_label = {
            "person": "人物",
            "event": "事件",
            "noun": "概念"
        }.get(node_type, "其他")
        graph_description += f"- {node['label']} ({type_label})\n"
    
    if edges:
        graph_description += "\n【关系连线】\n"
        for edge in edges:
            source_id = edge.get("source")
            target_id = edge.get("target")
            relation = edge.get("relation", "影响")
            
            if source_id in node_dict and target_id in node_dict:
                source_label = node_dict[source_id]["label"]
                target_label = node_dict[target_id]["label"]
                graph_description += f"- {source_label} {relation} {target_label}\n"
    
    system_prompt = """你是一位专业的知识分析师和报告撰写专家。请根据用户提供的因果图谱数据，生成一份结构清晰、逻辑严谨的分析报告。

报告要求：
1. 首先概述图谱中的主要元素（人物、事件、概念）
2. 详细分析各节点之间的因果关系和逻辑链条
3. 识别关键的根因节点和结果节点
4. 如果存在循环因果关系，请特别指出并分析其影响
5. 语言风格要专业、清晰、易于理解
6. 报告结构要有条理，使用适当的标题和分段

请用中文撰写报告，字数在300-800字之间。"""

    user_prompt = f"请根据以下因果图谱数据生成一份分析报告：\n\n{graph_description}\n\n请生成完整的分析报告。"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    try:
        report = await call_deepseek_api(
            api_key=data.api_key,
            model=data.model,
            messages=messages
        )
        return {"report": report}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成报告失败: {str(e)}")


@app.post("/api/ai-rewrite")
async def ai_rewrite(data: AIRewriteRequest):
    if not data.api_key:
        raise HTTPException(status_code=400, detail="请提供DeepSeek API Key")
    
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="请提供需要改写的文本")
    
    style_descriptions = {
        "formal": "正式专业的商务风格，用词严谨、规范，适合正式报告和文档",
        "casual": "轻松通俗的口语化风格，用词简单、亲切，适合日常交流",
        "academic": "学术严谨的学术风格，逻辑严密、术语准确，适合学术论文",
        "creative": "创意生动的文学风格，富有想象力和感染力，适合创意写作"
    }
    
    style_desc = style_descriptions.get(data.style, style_descriptions["formal"])
    
    system_prompt = f"""你是一位专业的文本改写专家。请将用户提供的文本改写成{style_desc}。

改写要求：
1. 保持原文的核心意思不变
2. 调整用词和句式，使其符合指定的风格
3. 可以适当增加连接词和过渡语，使文本更加流畅
4. 保持原文的结构和逻辑
5. 用中文输出改写后的文本"""

    user_prompt = f"请改写以下文本：\n\n{data.text}\n\n改写后的文本："

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    try:
        rewritten_text = await call_deepseek_api(
            api_key=data.api_key,
            model=data.model,
            messages=messages
        )
        return {"rewritten_text": rewritten_text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"改写失败: {str(e)}")


@app.post("/api/ai-expand")
async def ai_expand(data: AIExpandRequest):
    if not data.api_key:
        raise HTTPException(status_code=400, detail="请提供DeepSeek API Key")
    
    if not data.node_label.strip():
        raise HTTPException(status_code=400, detail="请提供需要扩写的节点名称")
    
    system_prompt = """你是一位专业的知识扩展专家。请根据用户提供的节点名称和上下文，对该节点进行详细的扩写说明。

扩写要求：
1. 介绍该节点的基本定义和概念
2. 分析该节点在整个因果关系中的地位和作用
3. 可以补充相关的背景知识和扩展信息
4. 语言要清晰、准确、有条理
5. 用中文输出，字数在150-300字之间"""

    context_info = f"\n\n上下文信息：{data.context}" if data.context else ""
    
    user_prompt = f"请详细扩写以下节点：{data.node_label}{context_info}\n\n扩写内容："

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    try:
        expanded_text = await call_deepseek_api(
            api_key=data.api_key,
            model=data.model,
            messages=messages
        )
        return {"expanded_text": expanded_text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"扩写失败: {str(e)}")


def calculate_node_metrics(nodes: List[Dict], edges: List[Dict]) -> Dict:
    node_ids = {node["id"] for node in nodes}
    node_dict = {node["id"]: node for node in nodes}
    
    in_degree = {node_id: 0 for node_id in node_ids}
    out_degree = {node_id: 0 for node_id in node_ids}
    
    out_edges = {node_id: [] for node_id in node_ids}
    in_edges_map = {node_id: [] for node_id in node_ids}
    
    for edge in edges:
        source = edge["source"]
        target = edge["target"]
        if source in out_edges and target in in_edges_map:
            out_degree[source] += 1
            in_degree[target] += 1
            out_edges[source].append({"target": target, "edge": edge})
            in_edges_map[target].append({"source": source, "edge": edge})
    
    betweenness = {node_id: 0.0 for node_id in node_ids}
    
    for start_node in node_ids:
        for end_node in node_ids:
            if start_node == end_node:
                continue
            
            all_paths = find_all_paths(out_edges, start_node, end_node)
            if not all_paths:
                continue
            
            path_count = len(all_paths)
            
            for middle_node in node_ids:
                if middle_node == start_node or middle_node == end_node:
                    continue
                
                paths_through_middle = sum(
                    1 for path in all_paths if middle_node in path[1:-1]
                )
                betweenness[middle_node] += paths_through_middle / path_count
    
    n = len(node_ids)
    if n > 2:
        normalize_factor = (n - 1) * (n - 2)
        for node_id in betweenness:
            betweenness[node_id] /= normalize_factor if normalize_factor > 0 else 1
    
    node_metrics = []
    for node_id in node_ids:
        node = node_dict[node_id]
        in_d = in_degree[node_id]
        out_d = out_degree[node_id]
        total_degree = in_d + out_d
        
        influence_score = (
            betweenness[node_id] * 100 + 
            total_degree * 10 + 
            out_d * 5
        )
        
        node_metrics.append({
            "node_id": node_id,
            "label": node.get("label", node_id),
            "type": node.get("type", "unknown"),
            "in_degree": in_d,
            "out_degree": out_d,
            "total_degree": total_degree,
            "betweenness_centrality": round(betweenness[node_id], 4),
            "influence_score": round(influence_score, 2)
        })
    
    node_metrics.sort(key=lambda x: x["influence_score"], reverse=True)
    
    return {
        "node_metrics": node_metrics,
        "summary": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "avg_in_degree": round(sum(in_degree.values()) / len(in_degree), 2) if in_degree else 0,
            "avg_out_degree": round(sum(out_degree.values()) / len(out_degree), 2) if out_degree else 0,
            "max_betweenness": round(max(betweenness.values()), 4) if betweenness else 0
        }
    }


def find_all_paths(out_edges: Dict, start: str, end: str, max_depth: int = 10) -> List[List[str]]:
    paths = []
    visited = set()
    
    def dfs(current: str, path: List[str]):
        if len(path) > max_depth:
            return
        
        if current == end:
            paths.append(list(path))
            return
        
        if current in visited:
            return
        
        visited.add(current)
        for neighbor_info in out_edges.get(current, []):
            neighbor = neighbor_info["target"]
            path.append(neighbor)
            dfs(neighbor, path)
            path.pop()
        visited.remove(current)
    
    dfs(start, [start])
    return paths


def calculate_path_weight(path: List[str], edges: List[Dict], node_dict: Dict) -> float:
    if len(path) < 2:
        return 0.0
    
    total_weight = 0.0
    
    for i in range(len(path) - 1):
        source = path[i]
        target = path[i + 1]
        
        for edge in edges:
            if edge["source"] == source and edge["target"] == target:
                relation = edge.get("relation", "影响")
                
                weight_map = {
                    "导致": 10,
                    "造成": 9,
                    "导火索": 8,
                    "引发": 7,
                    "推动": 6,
                    "促使": 5,
                    "影响": 4,
                    "起源于": 3,
                    "结果是": 2,
                    "阻碍": 1
                }
                
                edge_weight = weight_map.get(relation, 3)
                total_weight += edge_weight
                break
    
    return total_weight


@app.post("/api/analyze-influence")
async def analyze_influence(data: InfluenceAnalysisRequest):
    if not data.nodes:
        raise HTTPException(status_code=400, detail="请提供节点数据")
    
    try:
        result = calculate_node_metrics(data.nodes, data.edges)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"影响分析失败: {str(e)}")


@app.post("/api/query-path")
async def query_path(data: PathQueryRequest):
    if not data.nodes:
        raise HTTPException(status_code=400, detail="请提供节点数据")
    
    if not data.start_node_id or not data.end_node_id:
        raise HTTPException(status_code=400, detail="请指定起点和终点节点")
    
    node_ids = {node["id"] for node in data.nodes}
    
    if data.start_node_id not in node_ids:
        raise HTTPException(status_code=400, detail=f"起点节点 {data.start_node_id} 不存在")
    
    if data.end_node_id not in node_ids:
        raise HTTPException(status_code=400, detail=f"终点节点 {data.end_node_id} 不存在")
    
    if data.start_node_id == data.end_node_id:
        return {
            "paths": [],
            "critical_path": None,
            "start_node_id": data.start_node_id,
            "end_node_id": data.end_node_id,
            "message": "起点和终点不能是同一个节点"
        }
    
    out_edges = {node_id: [] for node_id in node_ids}
    node_dict = {node["id"]: node for node in data.nodes}
    
    for edge in data.edges:
        source = edge["source"]
        target = edge["target"]
        if source in out_edges:
            out_edges[source].append({"target": target, "edge": edge})
    
    all_paths = find_all_paths(out_edges, data.start_node_id, data.end_node_id)
    
    if not all_paths:
        return {
            "paths": [],
            "critical_path": None,
            "start_node_id": data.start_node_id,
            "end_node_id": data.end_node_id,
            "message": f"从 {node_dict[data.start_node_id].get('label', data.start_node_id)} 到 {node_dict[data.end_node_id].get('label', data.end_node_id)} 没有可用路径"
        }
    
    paths_with_info = []
    max_weight = -1
    critical_path_info = None
    
    for path in all_paths:
        path_nodes = []
        path_edges = []
        
        for i in range(len(path) - 1):
            source = path[i]
            target = path[i + 1]
            path_nodes.append({
                "node_id": source,
                "label": node_dict[source].get("label", source)
            })
            
            for edge in data.edges:
                if edge["source"] == source and edge["target"] == target:
                    path_edges.append({
                        "edge_id": edge["id"],
                        "source": source,
                        "target": target,
                        "relation": edge.get("relation", "影响")
                    })
                    break
        
        path_nodes.append({
            "node_id": path[-1],
            "label": node_dict[path[-1]].get("label", path[-1])
        })
        
        path_weight = calculate_path_weight(path, data.edges, node_dict)
        
        path_info = {
            "node_ids": path,
            "nodes": path_nodes,
            "edges": path_edges,
            "length": len(path) - 1,
            "weight": round(path_weight, 2)
        }
        
        paths_with_info.append(path_info)
        
        if path_weight > max_weight:
            max_weight = path_weight
            critical_path_info = path_info
    
    paths_with_info.sort(key=lambda x: x["weight"], reverse=True)
    
    return {
        "paths": paths_with_info,
        "critical_path": critical_path_info,
        "start_node_id": data.start_node_id,
        "end_node_id": data.end_node_id,
        "start_label": node_dict[data.start_node_id].get("label", data.start_node_id),
        "end_label": node_dict[data.end_node_id].get("label", data.end_node_id),
        "total_paths": len(paths_with_info),
        "message": f"找到 {len(paths_with_info)} 条路径"
    }


@app.post("/api/natural-language-graph")
async def natural_language_to_graph(data: NaturalLanguageGraphRequest):
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="请输入因果描述文本")
    
    if data.api_key:
        system_prompt = """你是一位专业的因果关系图谱构建专家。请分析用户提供的文本，识别其中的关键实体和它们之间的因果关系，输出结构化的JSON格式。

输出要求：
1. 从文本中提取所有关键实体（节点）
2. 识别实体之间的因果关系（边）
3. 输出严格的JSON格式，不要包含其他文字

节点类型说明：
- person: 人物
- event: 事件
- noun: 概念/事物

关系类型（优先选择）：
- 导致
- 造成
- 导火索
- 影响
- 促使
- 引发
- 推动
- 阻碍
- 起源于
- 结果是

输出格式示例：
{
    "nodes": [
        {"id": "n1", "label": "萨拉热窝事件", "type": "event"},
        {"id": "n2", "label": "第一次世界大战", "type": "event"},
        {"id": "n3", "label": "斐迪南大公", "type": "person"}
    ],
    "edges": [
        {"source": "n1", "target": "n2", "relation": "导火索"},
        {"source": "n3", "target": "n1", "relation": "引发"}
    ]
}

请确保：
1. 所有边的关系类型都从上面的10种类型中选择
2. 节点id使用n1, n2, n3...格式
3. 只输出JSON，不要有其他解释文字"""

        user_prompt = f"请分析以下文本，构建因果关系图谱：\n\n{data.text}\n\n请只输出JSON格式的结果。"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            ai_response = await call_deepseek_api(
                api_key=data.api_key,
                model=data.model,
                messages=messages
            )
            
            json_match = re.search(r'\{[\s\S]*\}', ai_response)
            if json_match:
                try:
                    result = eval(json_match.group(0))
                    if "nodes" in result and "edges" in result:
                        return {
                            "nodes": result["nodes"],
                            "edges": result["edges"],
                            "method": "ai"
                        }
                except:
                    pass
        except Exception as e:
            pass
    
    return await extract_graph_from_text_simple(data.text)


async def extract_graph_from_text_simple(text: str) -> Dict:
    entities_dict: Dict[str, Dict] = {}
    
    for pattern in PERSON_PATTERNS:
        matches = re.findall(pattern, text)
        for match in matches:
            if len(match) >= 2 and len(match) <= 4:
                if match not in entities_dict:
                    entities_dict[match] = {
                        "text": match,
                        "type": "person"
                    }
    
    for pattern in EVENT_PATTERNS:
        matches = re.findall(pattern, text)
        for match in matches:
            if len(match) >= 4:
                if match not in entities_dict:
                    entities_dict[match] = {
                        "text": match,
                        "type": "event"
                    }
    
    words = jieba.lcut(text)
    stop_words = set([
        "的", "了", "是", "在", "我", "有", "和", "就",
        "不", "人", "都", "一", "一个", "上", "也", "很",
        "到", "说", "要", "去", "你", "会", "着", "没有",
        "看", "好", "自己", "这", "那", "他", "她", "它",
        "们", "这个", "那个", "什么", "怎么", "为什么",
        "哪", "哪里", "谁", "多少", "几", "啊", "吧", "呢",
        "吗", "呀", "哦", "嗯", "哈", "啦", "喽", "呗"
    ])
    
    for word, flag in pseg.cut(text):
        if flag.startswith('n') and len(word) >= 2 and word not in stop_words:
            if word not in entities_dict:
                entities_dict[word] = {
                    "text": word,
                    "type": "noun"
                }
    
    entities = list(entities_dict.values())
    
    if len(entities) < 2:
        return {
            "nodes": [],
            "edges": [],
            "method": "simple",
            "message": "未能提取足够的实体"
        }
    
    nodes = []
    node_id_map = {}
    for i, entity in enumerate(entities):
        node_id = f"n{i+1}"
        node_id_map[entity["text"]] = node_id
        nodes.append({
            "id": node_id,
            "label": entity["text"],
            "type": entity["type"]
        })
    
    causal_keywords = {
        "导致": "导致",
        "造成": "造成",
        "引发": "引发",
        "促使": "促使",
        "推动": "推动",
        "影响": "影响",
        "起源于": "起源于",
        "结果是": "结果是"
    }
    
    edges = []
    edge_id = 1
    
    sentences = re.split(r'[。！？；\n]+', text)
    
    for sentence in sentences:
        if not sentence.strip():
            continue
        
        for keyword, relation in causal_keywords.items():
            if keyword in sentence:
                parts = sentence.split(keyword)
                if len(parts) >= 2:
                    before_part = parts[0]
                    after_part = keyword.join(parts[1:])
                    
                    source_candidates = []
                    target_candidates = []
                    
                    for entity_text, node_id in node_id_map.items():
                        if entity_text in before_part:
                            source_candidates.append(node_id)
                        if entity_text in after_part:
                            target_candidates.append(node_id)
                    
                    for source in source_candidates:
                        for target in target_candidates:
                            if source != target:
                                exists = any(e["source"] == source and e["target"] == target for e in edges)
                                if not exists:
                                    edges.append({
                                        "id": f"e{edge_id}",
                                        "source": source,
                                        "target": target,
                                        "relation": relation
                                    })
                                    edge_id += 1
    
    if not edges and len(nodes) >= 2:
        for i in range(len(nodes) - 1):
            if nodes[i]["type"] == "event" or nodes[i+1]["type"] == "event":
                edges.append({
                    "id": f"e{edge_id}",
                    "source": nodes[i]["id"],
                    "target": nodes[i+1]["id"],
                    "relation": "影响"
                })
                edge_id += 1
                if len(edges) >= 3:
                    break
    
    return {
        "nodes": nodes,
        "edges": edges,
        "method": "simple",
        "message": f"提取了 {len(nodes)} 个节点和 {len(edges)} 条边"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
